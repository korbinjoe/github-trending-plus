import type { FeedPeriod, FeedView } from "@github-trending/core/types";
import { getDb } from "@github-trending/db";
import { rankingRuns } from "@github-trending/db";
import { and, desc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

export type RankingRunRow = typeof rankingRuns.$inferSelect;

async function fetchLatestCompletedRun(
  period: FeedPeriod,
  view: FeedView,
): Promise<RankingRunRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(rankingRuns)
    .where(
      and(
        eq(rankingRuns.period, period),
        eq(rankingRuns.view, view),
        eq(rankingRuns.status, "completed"),
      ),
    )
    .orderBy(desc(rankingRuns.completedAt))
    .limit(1);
  return rows[0] ?? null;
}

/** Cached latest completed ranking run (shared across feed, search, hydrate). */
export function getCachedLatestCompletedRun(
  period: FeedPeriod,
  view: FeedView,
): Promise<RankingRunRow | null> {
  return unstable_cache(
    () => fetchLatestCompletedRun(period, view),
    ["ranking-run", period, view],
    { revalidate: 300, tags: ["feed", "ranking"] },
  )();
}
