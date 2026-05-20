import {
  FeedPeriodSchema,
  type FeedPeriod,
  type RepoAlternativeDetail,
  type RepoDetail,
} from "@github-trending/core/types";
import { buildStarHistoryUrl } from "@github-trending/core";
import { getAlternativesForRepo } from "@github-trending/github";
import { getPhSignalsForRepoIds } from "@github-trending/producthunt";
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

function buildUrls(
  owner: string,
  name: string,
  language: string | null,
): RepoDetail["urls"] {
  return {
    github: githubRepoUrl(owner, name),
    starHistory: buildStarHistoryUrl([{ owner, name }]),
    ossInsight: ossInsightUrl(owner, name),
    librariesIo: librariesIoUrl(owner, name),
    bestOfJs:
      language === "JavaScript" || language === "TypeScript"
        ? "https://bestofjs.org"
        : undefined,
  };
}

async function fetchRepoBySlug(owner: string, name: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(repositories)
    .where(eq(repositories.fullName, `${owner}/${name}`))
    .limit(1);
  return rows[0] ?? null;
}

async function buildAlternatives(
  repoId: string,
  feedPeriod: FeedPeriod,
  runId: string,
): Promise<RepoAlternativeDetail[]> {
  const db = getDb();
  const altEdges = await getAlternativesForRepo(
    db,
    repoId,
    feedPeriod,
    ALT_LIMIT,
  );
  const altSlugs = altEdges.map((e) => e.slug);
  if (altSlugs.length === 0) return [];

  const candidateRows = await db
    .select()
    .from(repositories)
    .where(inArray(repositories.fullName, altSlugs));

  const candidateBySlug = new Map(
    candidateRows.map((r) => [`${r.owner}/${r.name}`, r]),
  );
  const candidateIds = candidateRows.map((r) => r.id);

  const altMetricRows =
    candidateIds.length > 0
      ? await db
          .select()
          .from(periodMetrics)
          .where(
            and(
              inArray(periodMetrics.repoId, candidateIds),
              eq(periodMetrics.rankingRunId, runId),
            ),
          )
      : [];

  const metricsByRepoId = new Map(
    altMetricRows.map((m) => [m.repoId, m]),
  );

  const alternatives: RepoAlternativeDetail[] = [];
  for (const edge of altEdges) {
    const candidate = candidateBySlug.get(edge.slug);
    if (!candidate) continue;
    const candidateMetric = metricsByRepoId.get(candidate.id);
    alternatives.push({
      owner: candidate.owner,
      name: candidate.name,
      slug: edge.slug,
      description: candidate.description ?? "",
      deltaStars: candidateMetric?.deltaStars ?? 0,
      totalStars: candidateMetric?.totalStars ?? 0,
      health: candidateMetric?.health ?? "low",
      license: candidate.license,
      why: edge.why,
    });
  }
  return alternatives;
}

/** Core detail for first paint (no alternatives panel). */
export async function getRepoDetailCore(
  owner: string,
  name: string,
  period?: string,
): Promise<RepoDetail | null> {
  const feedPeriod = parsePeriod(period);
  const repo = await fetchRepoBySlug(owner, name);
  if (!repo) return null;

  const db = getDb();
  const [snapRows, run, phByRepo] = await Promise.all([
    db
      .select({
        stars: repositorySnapshots.stars,
        commits30d: repositorySnapshots.commits30d,
        pushedAt: repositorySnapshots.pushedAt,
      })
      .from(repositorySnapshots)
      .where(eq(repositorySnapshots.repoId, repo.id))
      .orderBy(desc(repositorySnapshots.capturedAt))
      .limit(1),
    getCachedLatestCompletedRun(feedPeriod, "velocity"),
    getPhSignalsForRepoIds(db, [repo.id]),
  ]);

  const latest = snapRows[0];
  let metric: (typeof periodMetrics.$inferSelect) | null = null;
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

  const topics = (repo.topics as string[]) ?? [];
  const slug = `${repo.owner}/${repo.name}`;

  return {
    owner: repo.owner,
    name: repo.name,
    slug,
    description: repo.description ?? "",
    deltaStars: metric?.deltaStars ?? 0,
    totalStars: metric?.totalStars ?? latest?.stars ?? 0,
    health: metric?.health ?? "low",
    tags: topics,
    commits30d: metric?.commits30d ?? latest?.commits30d ?? 0,
    lastPush: latest?.pushedAt?.toISOString() ?? null,
    license: repo.license,
    language: repo.language,
    isEarlySignal: metric?.isEarlySignal === 1,
    phSignal: phByRepo.get(repo.id),
    alternatives: [],
    compareUrl: compareUrl([slug]),
    urls: buildUrls(repo.owner, repo.name, repo.language),
  };
}

export type RepoAlternativesPayload = {
  alternatives: RepoAlternativeDetail[];
  compareUrl: string;
};

/** Alternatives panel (streamed after core). */
export async function getRepoAlternatives(
  owner: string,
  name: string,
  period?: string,
): Promise<RepoAlternativesPayload | null> {
  const feedPeriod = parsePeriod(period);
  const [repo, run] = await Promise.all([
    fetchRepoBySlug(owner, name),
    getCachedLatestCompletedRun(feedPeriod, "velocity"),
  ]);
  if (!repo) return null;
  if (!run) {
    return { alternatives: [], compareUrl: compareUrl([`${owner}/${name}`]) };
  }

  const alternatives = await buildAlternatives(repo.id, feedPeriod, run.id);
  const slug = `${repo.owner}/${repo.name}`;
  const compareSlugs = [slug, ...alternatives.map((a) => a.slug)].slice(0, 4);

  return {
    alternatives,
    compareUrl: compareUrl(compareSlugs),
  };
}

/** Full detail (API). */
export async function getRepoDetail(
  owner: string,
  name: string,
  period?: string,
): Promise<RepoDetail | null> {
  const [core, alts] = await Promise.all([
    getRepoDetailCore(owner, name, period),
    getRepoAlternatives(owner, name, period),
  ]);
  if (!core || !alts) return null;
  return { ...core, alternatives: alts.alternatives, compareUrl: alts.compareUrl };
}
