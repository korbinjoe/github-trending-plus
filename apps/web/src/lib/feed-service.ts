import {
  FeedPeriodSchema,
  GithubFeedViewSchema,
  type FeedItem,
  type FeedResponse,
} from "@github-trending/core/types";
import { getAlternativesForRepos } from "@github-trending/github";
import { getPhSignalsForRepoIds } from "@github-trending/producthunt";
import { getDb } from "@github-trending/db";
import { periodMetrics, repositories } from "@github-trending/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { getCachedLatestCompletedRun } from "./ranking-run-cache";
import { compareUrl } from "./site";
import { toIsoString } from "./timestamp";

const PAGE_SIZE = 24;

export async function getFeed(params: {
  view: string;
  period: string;
  lang?: string;
  topic?: string;
  cursor?: string;
  includeNoise?: boolean;
}): Promise<FeedResponse> {
  const view = GithubFeedViewSchema.parse(params.view);
  const period = FeedPeriodSchema.parse(params.period);
  const db = getDb();

  const run = await getCachedLatestCompletedRun(period, view);
  if (!run) {
    return { items: [], nextCursor: null, rankingRunId: null, updatedAt: null };
  }

  const offset = params.cursor ? Number.parseInt(params.cursor, 10) : 0;
  const fetchLimit = PAGE_SIZE + 1;

  const conditions = [
    eq(periodMetrics.rankingRunId, run.id),
    eq(periodMetrics.period, period),
    eq(periodMetrics.view, view),
  ];

  if (params.lang) {
    conditions.push(eq(periodMetrics.language, params.lang));
  }

  if (params.topic) {
    const topicLower = params.topic.toLowerCase();
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${repositories.topics}) AS elem
        WHERE lower(elem::text) = ${topicLower}
      )`,
    );
  }

  const rows = await db
    .select({
      metric: periodMetrics,
      repo: repositories,
    })
    .from(periodMetrics)
    .innerJoin(repositories, eq(periodMetrics.repoId, repositories.id))
    .where(and(...conditions))
    .orderBy(asc(periodMetrics.velocityRank))
    .offset(offset)
    .limit(fetchLimit);

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  const repoIds = page.map(({ repo }) => repo.id);
  const [phByRepo, alternativesByRepo] = await Promise.all([
    getPhSignalsForRepoIds(db, repoIds),
    getAlternativesForRepos(db, repoIds, period, 2),
  ]);

  const items: FeedItem[] = page.map(({ metric: m, repo }) => {
    const topics = (repo.topics as string[]) ?? [];
    const alternatives = alternativesByRepo.get(repo.id) ?? [];
    const slugs = [
      `${repo.owner}/${repo.name}`,
      ...alternatives.map((a) => a.slug),
    ].slice(0, 4);

    return {
      rank: m.velocityRank ?? 0,
      owner: repo.owner,
      name: repo.name,
      slug: `${repo.owner}/${repo.name}`,
      description: repo.description ?? "",
      deltaStars: m.deltaStars,
      totalStars: m.totalStars,
      health: m.health,
      tags: topics.slice(0, 5),
      isEarlySignal: m.isEarlySignal === 1,
      phSignal: phByRepo.get(repo.id),
      alternatives,
      compareUrl: slugs.length > 1 ? compareUrl(slugs) : undefined,
    };
  });

  const nextOffset = offset + PAGE_SIZE;

  return {
    items,
    nextCursor: hasMore ? String(nextOffset) : null,
    rankingRunId: run.id,
    updatedAt: toIsoString(run.completedAt),
  };
}
