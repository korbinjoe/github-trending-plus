import type { FavoriteHydrateResult, FavoriteRepoRef } from "@github-trending/core/types";
import { getDb } from "@github-trending/db";
import {
  periodMetrics,
  rankingRuns,
  repositories,
} from "@github-trending/db";
import { and, desc, eq, inArray } from "drizzle-orm";

function normalizeRef(ref: FavoriteRepoRef): FavoriteRepoRef {
  return { owner: ref.owner.trim(), name: ref.name.trim() };
}

export async function hydrateFavorites(
  refs: FavoriteRepoRef[],
): Promise<FavoriteHydrateResult[]> {
  const normalized = refs.map(normalizeRef);
  if (normalized.length === 0) return [];

  const db = getDb();
  const fullNames = normalized.map((r) => `${r.owner}/${r.name}`);

  const repoRows = await db
    .select()
    .from(repositories)
    .where(inArray(repositories.fullName, fullNames));

  const repoByFullName = new Map(
    repoRows.map((r) => [r.fullName.toLowerCase(), r]),
  );

  const latestRun = await db
    .select()
    .from(rankingRuns)
    .where(
      and(
        eq(rankingRuns.period, "today"),
        eq(rankingRuns.view, "velocity"),
        eq(rankingRuns.status, "completed"),
      ),
    )
    .orderBy(desc(rankingRuns.completedAt))
    .limit(1);

  const run = latestRun[0];
  const metricsByRepoId = new Map<
    string,
    (typeof periodMetrics.$inferSelect)
  >();

  if (run && repoRows.length > 0) {
    const metricRows = await db
      .select()
      .from(periodMetrics)
      .where(
        and(
          eq(periodMetrics.rankingRunId, run.id),
          inArray(
            periodMetrics.repoId,
            repoRows.map((r) => r.id),
          ),
        ),
      );
    for (const m of metricRows) {
      metricsByRepoId.set(m.repoId, m);
    }
  }

  return normalized.map((ref) => {
    const fullName = `${ref.owner}/${ref.name}`;
    const repo = repoByFullName.get(fullName.toLowerCase());
    if (!repo) {
      return { owner: ref.owner, name: ref.name, fullName, found: false };
    }

    const metric = metricsByRepoId.get(repo.id);
    const topics = (repo.topics as string[]) ?? [];

    return {
      owner: repo.owner,
      name: repo.name,
      fullName: repo.fullName,
      found: true,
      description: repo.description ?? "",
      deltaStars: metric?.deltaStars ?? 0,
      health: metric?.health ?? "low",
      language: repo.language,
      tags: topics,
    };
  });
}
