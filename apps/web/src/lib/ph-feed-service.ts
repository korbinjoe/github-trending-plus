import {
  FeedPeriodSchema,
  PhGithubFilterSchema,
  type FeedItem,
  type FeedPeriod,
  type PhFeedEntry,
  type PhFeedResponse,
  type PhGithubFilter,
  type PhLaunchItem,
  type PhProductItem,
  type PhSignal,
} from "@github-trending/core/types";
import { periodStart, shouldExclude } from "@github-trending/core";
import { getAlternativesForRepos } from "@github-trending/github";
import { classifyPhEntryKind } from "@/lib/ph-feed-kind";
import { getPhLeaderboardPosts, type PhLeaderboardRow } from "@github-trending/producthunt";
import { getDb } from "@github-trending/db";
import { periodMetrics, productHuntPosts, repositories } from "@github-trending/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getCachedLatestCompletedRun } from "./ranking-run-cache";
import { compareUrl } from "./site";
import { toIsoString } from "./timestamp";

const PAGE_SIZE = 24;

function rowToPhSignal(row: PhLeaderboardRow): PhSignal {
  return {
    slug: row.slug,
    phUrl: row.phUrl,
    votesCount: row.votesCount,
    featuredAt: row.featuredAt?.toISOString() ?? null,
    postedAt: row.postedAt.toISOString(),
    tagline: row.tagline ?? undefined,
  };
}

export async function getPhFeed(params: {
  period: string;
  phGithub?: string;
  lang?: string;
  topic?: string;
  cursor?: string;
  includeNoise?: boolean;
}): Promise<PhFeedResponse> {
  const period = FeedPeriodSchema.parse(params.period);
  const phGithub: PhGithubFilter = PhGithubFilterSchema.parse(
    params.phGithub ?? "all",
  );
  const postedAfter = periodStart(period);
  const db = getDb();
  const offset = params.cursor ? Number.parseInt(params.cursor, 10) : 0;

  const { rows, nextCursor } = await getPhLeaderboardPosts(db, {
    postedAfter,
    phGithub,
    topic: params.topic,
    cursor: offset,
    limit: PAGE_SIZE,
  });

  const repoIds = rows
    .map((r) => r.repoId)
    .filter((id): id is string => Boolean(id));
  const uniqueRepoIds = [...new Set(repoIds)];

  const [repoRows, phUpdated, velocityRun] = await Promise.all([
    uniqueRepoIds.length > 0
      ? db
          .select()
          .from(repositories)
          .where(inArray(repositories.id, uniqueRepoIds))
      : Promise.resolve([]),
    db
      .select({ updatedAt: productHuntPosts.updatedAt })
      .from(productHuntPosts)
      .orderBy(desc(productHuntPosts.updatedAt))
      .limit(1),
    getCachedLatestCompletedRun(period, "velocity"),
  ]);

  const repoById = new Map(repoRows.map((r) => [r.id, r]));

  let metricsByRepo = new Map<
    string,
    typeof periodMetrics.$inferSelect
  >();
  if (velocityRun && uniqueRepoIds.length > 0) {
    const metricRows = await db
      .select()
      .from(periodMetrics)
      .where(
        and(
          eq(periodMetrics.rankingRunId, velocityRun.id),
          eq(periodMetrics.period, period),
          eq(periodMetrics.view, "velocity"),
          inArray(periodMetrics.repoId, uniqueRepoIds),
        ),
      );
    metricsByRepo = new Map(metricRows.map((m) => [m.repoId, m]));
  }

  const alternativesByRepo =
    uniqueRepoIds.length > 0
      ? await getAlternativesForRepos(db, uniqueRepoIds, period, 2)
      : new Map();

  const entries: PhFeedEntry[] = [];
  let rank = offset + 1;

  for (const row of rows) {
    const kind = classifyPhEntryKind(row);
    const phSignal = rowToPhSignal(row);

    if (kind === "repo" && row.repoId) {
      const repo = repoById.get(row.repoId);
      if (!repo) continue;

      if (params.lang && repo.language !== params.lang) {
        continue;
      }

      const metric = metricsByRepo.get(row.repoId);
      const topics = (repo.topics as string[]) ?? [];

      if (
        !params.includeNoise &&
        shouldExclude(
          {
            owner: repo.owner,
            name: repo.name,
            topics,
            commits30d: metric?.commits30d ?? 0,
            totalStars: metric?.totalStars ?? 0,
          },
          { includeNoise: false },
        )
      ) {
        continue;
      }

      const alternatives = alternativesByRepo.get(repo.id) ?? [];
      const slugs = [
        `${repo.owner}/${repo.name}`,
        ...alternatives.map((alt: FeedItem["alternatives"][number]) => alt.slug),
      ].slice(0, 4);

      const item: FeedItem = {
        rank,
        owner: repo.owner,
        name: repo.name,
        slug: `${repo.owner}/${repo.name}`,
        description: repo.description ?? "",
        deltaStars: metric?.deltaStars ?? 0,
        totalStars: metric?.totalStars ?? 0,
        health: metric?.health ?? "low",
        tags: topics.slice(0, 5),
        isEarlySignal: metric?.isEarlySignal === 1,
        phSignal,
        alternatives,
        compareUrl: slugs.length > 1 ? compareUrl(slugs) : undefined,
      };

      entries.push({ kind: "repo", item });
      rank += 1;
      continue;
    }

    if (kind === "launch" && row.githubOwner && row.githubName) {
      const launch: PhLaunchItem = {
        rank,
        name: row.name,
        tagline: row.tagline ?? undefined,
        githubOwner: row.githubOwner,
        githubName: row.githubName,
        slug: `${row.githubOwner}/${row.githubName}`,
        phSignal,
        votesCount: row.votesCount,
        postedAt: row.postedAt.toISOString(),
      };
      entries.push({ kind: "launch", item: launch });
      rank += 1;
      continue;
    }

    const product: PhProductItem = {
      rank,
      name: row.name,
      tagline: row.tagline ?? undefined,
      phSignal,
      votesCount: row.votesCount,
      postedAt: row.postedAt.toISOString(),
      website: row.websiteRedirect ?? undefined,
    };
    entries.push({ kind: "product", item: product });
    rank += 1;
  }

  return {
    items: entries,
    nextCursor,
    updatedAt: toIsoString(phUpdated[0]?.updatedAt),
  };
}
