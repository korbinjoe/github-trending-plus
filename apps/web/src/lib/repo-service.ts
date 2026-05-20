import {
  FeedPeriodSchema,
  type FeedPeriod,
  type RepoDetail,
} from "@github-trending/core/types";
import { buildStarHistoryUrl } from "@github-trending/core";
import { getAlternativesForRepo } from "@github-trending/github";
import { getPhSignalForRepoId } from "@github-trending/producthunt";
import { getDb } from "@github-trending/db";
import {
  periodMetrics,
  repositories,
  repositorySnapshots,
} from "@github-trending/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getCachedLatestCompletedRun } from "./ranking-run-cache";
import {
  compareUrl,
  githubRepoUrl,
  librariesIoUrl,
  ossInsightUrl,
} from "./site";

const DEFAULT_PERIOD: FeedPeriod = "today";
const ALT_LIMIT = 5;

function parsePeriod(period?: string): FeedPeriod {
  const parsed = FeedPeriodSchema.safeParse(period);
  return parsed.success ? parsed.data : DEFAULT_PERIOD;
}

export async function getRepoDetail(
  owner: string,
  name: string,
  period?: string,
): Promise<RepoDetail | null> {
  const feedPeriod = parsePeriod(period);
  const db = getDb();
  const rows = await db
    .select()
    .from(repositories)
    .where(eq(repositories.fullName, `${owner}/${name}`))
    .limit(1);

  const repo = rows[0];
  if (!repo) return null;

  const snap = await db
    .select()
    .from(repositorySnapshots)
    .where(eq(repositorySnapshots.repoId, repo.id))
    .orderBy(desc(repositorySnapshots.capturedAt))
    .limit(1);

  const run = await getCachedLatestCompletedRun(feedPeriod, "velocity");
  let metric = null;
  if (run) {
    const metricRows = await db
      .select()
      .from(periodMetrics)
      .where(
        and(
          eq(periodMetrics.repoId, repo.id),
          eq(periodMetrics.rankingRunId, run.id),
        ),
      )
      .limit(1);
    metric = metricRows[0] ?? null;
  }

  const latest = snap[0];
  const topics = (repo.topics as string[]) ?? [];
  const slug = `${repo.owner}/${repo.name}`;

  const altEdges = await getAlternativesForRepo(
    db,
    repo.id,
    feedPeriod,
    ALT_LIMIT,
  );

  const altSlugs = altEdges.map((e) => e.slug);
  const candidateRows =
    altSlugs.length > 0
      ? await db
          .select()
          .from(repositories)
          .where(inArray(repositories.fullName, altSlugs))
      : [];
  const candidateBySlug = new Map(
    candidateRows.map((r) => [`${r.owner}/${r.name}`, r]),
  );
  const candidateIds = candidateRows.map((r) => r.id);

  const metricsByRepoId = new Map<
    string,
    (typeof periodMetrics.$inferSelect)
  >();
  if (run && candidateIds.length > 0) {
    const metricRows = await db
      .select()
      .from(periodMetrics)
      .where(
        and(
          inArray(periodMetrics.repoId, candidateIds),
          eq(periodMetrics.rankingRunId, run.id),
        ),
      );
    for (const m of metricRows) {
      metricsByRepoId.set(m.repoId, m);
    }
  }

  const snapByRepoId = new Map<
    string,
    (typeof repositorySnapshots.$inferSelect)
  >();
  if (candidateIds.length > 0) {
    const snapRows = await db
      .select()
      .from(repositorySnapshots)
      .where(inArray(repositorySnapshots.repoId, candidateIds))
      .orderBy(desc(repositorySnapshots.capturedAt));
    for (const s of snapRows) {
      if (!snapByRepoId.has(s.repoId)) {
        snapByRepoId.set(s.repoId, s);
      }
    }
  }

  const alternatives: RepoDetail["alternatives"] = [];
  for (const edge of altEdges) {
    const candidate = candidateBySlug.get(edge.slug);
    if (!candidate) continue;
    const candidateMetric = metricsByRepoId.get(candidate.id);
    const candidateSnap = snapByRepoId.get(candidate.id);

    alternatives.push({
      owner: candidate.owner,
      name: candidate.name,
      slug: edge.slug,
      description: candidate.description ?? "",
      deltaStars: candidateMetric?.deltaStars ?? 0,
      totalStars: candidateSnap?.stars ?? 0,
      health: candidateMetric?.health ?? "low",
      license: candidate.license,
      why: edge.why,
    });
  }

  const compareSlugs = [slug, ...alternatives.map((a) => a.slug)].slice(0, 4);
  const phSignal = await getPhSignalForRepoId(db, repo.id);

  return {
    owner: repo.owner,
    name: repo.name,
    slug,
    description: repo.description ?? "",
    deltaStars: metric?.deltaStars ?? 0,
    totalStars: latest?.stars ?? 0,
    health: metric?.health ?? "low",
    tags: topics,
    commits30d: latest?.commits30d ?? 0,
    lastPush: latest?.pushedAt?.toISOString() ?? null,
    license: repo.license,
    language: repo.language,
    isEarlySignal: metric?.isEarlySignal === 1,
    phSignal: phSignal ?? undefined,
    alternatives,
    compareUrl: compareUrl(compareSlugs),
    urls: {
      github: githubRepoUrl(repo.owner, repo.name),
      starHistory: buildStarHistoryUrl([{ owner: repo.owner, name: repo.name }]),
      ossInsight: ossInsightUrl(repo.owner, repo.name),
      librariesIo: librariesIoUrl(repo.owner, repo.name),
      bestOfJs:
        repo.language === "JavaScript" || repo.language === "TypeScript"
          ? "https://bestofjs.org"
          : undefined,
    },
  };
}
