import { isAwesomeList } from "@github-trending/core";
import type { FeedPeriod } from "@github-trending/core/types";
import type { Database } from "@github-trending/db";
import {
  alternativesEdges,
  periodMetrics,
  repositories,
} from "@github-trending/db";
import { and, asc, eq, inArray, lte } from "drizzle-orm";

const MIN_HEALTH_SCORE = 2;
const EDGE_INSERT_CHUNK = 200;

function sharedTopics(a: string[], b: string[]): boolean {
  const setB = new Set(b.map((t) => t.toLowerCase()));
  return a.some((t) => setB.has(t.toLowerCase()));
}

export async function computeAlternativesForPeriod(
  db: Database,
  period: FeedPeriod,
  rankingRunId: string,
): Promise<number> {
  const metrics = await db
    .select({
      repoId: periodMetrics.repoId,
      healthScore: periodMetrics.healthScore,
      deltaStars: periodMetrics.deltaStars,
    })
    .from(periodMetrics)
    .where(
      and(
        eq(periodMetrics.rankingRunId, rankingRunId),
        eq(periodMetrics.period, period),
        eq(periodMetrics.view, "velocity"),
      ),
    );

  const repos = await db.select().from(repositories);
  const repoMap = new Map(repos.map((r) => [r.id, r]));

  const allEdges: (typeof alternativesEdges.$inferInsert)[] = [];

  for (const anchor of metrics) {
    const anchorRepo = repoMap.get(anchor.repoId);
    if (!anchorRepo) continue;

    const anchorTopics = (anchorRepo.topics as string[]) ?? [];
    const candidates: Array<{
      repoId: string;
      score: number;
      reason: string;
    }> = [];

    for (const other of metrics) {
      if (other.repoId === anchor.repoId) continue;
      const candidateRepo = repoMap.get(other.repoId);
      if (!candidateRepo) continue;
      if (candidateRepo.isFork) continue;

      const signals = {
        owner: candidateRepo.owner,
        name: candidateRepo.name,
        topics: (candidateRepo.topics as string[]) ?? [],
        commits30d: 1,
        totalStars: 0,
      };
      if (isAwesomeList(signals)) continue;
      if (other.healthScore < MIN_HEALTH_SCORE) continue;
      if (anchorRepo.language && candidateRepo.language !== anchorRepo.language) {
        continue;
      }

      const candidateTopics = (candidateRepo.topics as string[]) ?? [];
      if (!sharedTopics(anchorTopics, candidateTopics)) continue;

      const topic = anchorTopics.find((t) =>
        candidateTopics.map((x) => x.toLowerCase()).includes(t.toLowerCase()),
      );
      candidates.push({
        repoId: other.repoId,
        score: other.healthScore + other.deltaStars / 1000,
        reason: topic ? `Shared topic: ${topic}` : "Same language",
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const top = candidates.slice(0, 5);

    let rank = 1;
    for (const c of top) {
      allEdges.push({
        anchorRepoId: anchor.repoId,
        candidateRepoId: c.repoId,
        period,
        reason: c.reason,
        score: c.score,
        rank,
      });
      rank += 1;
    }
  }

  for (let i = 0; i < allEdges.length; i += EDGE_INSERT_CHUNK) {
    await db
      .insert(alternativesEdges)
      .values(allEdges.slice(i, i + EDGE_INSERT_CHUNK))
      .onConflictDoNothing();
  }

  return allEdges.length;
}

export type AlternativeItem = {
  owner: string;
  name: string;
  slug: string;
  why: string;
};

export async function getAlternativesForRepos(
  db: Database,
  anchorRepoIds: string[],
  period: FeedPeriod,
  limit = 2,
): Promise<Map<string, AlternativeItem[]>> {
  const result = new Map<string, AlternativeItem[]>();
  if (anchorRepoIds.length === 0) return result;

  for (const id of anchorRepoIds) {
    result.set(id, []);
  }

  const edges = await db
    .select()
    .from(alternativesEdges)
    .where(
      and(
        inArray(alternativesEdges.anchorRepoId, anchorRepoIds),
        eq(alternativesEdges.period, period),
        lte(alternativesEdges.rank, limit),
      ),
    )
    .orderBy(asc(alternativesEdges.anchorRepoId), asc(alternativesEdges.rank));

  const candidateIds = [...new Set(edges.map((e) => e.candidateRepoId))];
  if (candidateIds.length === 0) return result;

  const repoRows = await db
    .select()
    .from(repositories)
    .where(inArray(repositories.id, candidateIds));
  const repoMap = new Map(repoRows.map((r) => [r.id, r]));

  for (const edge of edges) {
    const repo = repoMap.get(edge.candidateRepoId);
    if (!repo) continue;
    const list = result.get(edge.anchorRepoId);
    if (!list || list.length >= limit) continue;
    list.push({
      owner: repo.owner,
      name: repo.name,
      slug: `${repo.owner}/${repo.name}`,
      why: edge.reason,
    });
  }

  return result;
}

export async function getAlternativesForRepo(
  db: Database,
  anchorRepoId: string,
  period: FeedPeriod,
  limit = 2,
): Promise<AlternativeItem[]> {
  const map = await getAlternativesForRepos(db, [anchorRepoId], period, limit);
  return map.get(anchorRepoId) ?? [];
}
