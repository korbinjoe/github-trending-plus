import {
  computeDeltaStars,
  periodStart,
  resolveBaselineStars,
  utcDateDaysAgo,
} from "@github-trending/core";
import type { FeedPeriod } from "@github-trending/core/types";
import type { Database } from "@github-trending/db";
import { repositorySnapshots } from "@github-trending/db";
import { desc } from "drizzle-orm";
import { loadAllRepoStarDailyByRepo } from "./repo-star-daily";

export { periodStart } from "@github-trending/core";

const STAR_DAILY_LOOKBACK_DAYS = 400;

type SnapshotRow = typeof repositorySnapshots.$inferSelect;

export interface RepoSnapshotPair {
  latest: SnapshotRow;
  baselineStars: number;
}

/** Snapshot pairs with daily-star baseline for week–year periods. */
export async function loadPeriodSnapshotPairs(
  db: Database,
  period: FeedPeriod,
): Promise<Map<string, RepoSnapshotPair>> {
  const pairs = await loadRepoSnapshotPairs(db, period);
  if (period === "today") {
    return pairs;
  }

  const dailyByRepo = await loadAllRepoStarDailyByRepo(
    db,
    utcDateDaysAgo(STAR_DAILY_LOOKBACK_DAYS),
  );

  for (const [repoId, pair] of pairs) {
    const daily = dailyByRepo.get(repoId) ?? [];
    pair.baselineStars = resolveBaselineStars(
      period,
      pair.baselineStars,
      daily,
    );
  }

  return pairs;
}

/** Load all snapshots once, then derive latest + period baseline per repo. */
export async function loadRepoSnapshotPairs(
  db: Database,
  period: FeedPeriod,
): Promise<Map<string, RepoSnapshotPair>> {
  const since = periodStart(period);
  const all = await db
    .select()
    .from(repositorySnapshots)
    .orderBy(repositorySnapshots.repoId, desc(repositorySnapshots.capturedAt));

  const byRepo = new Map<string, SnapshotRow[]>();
  for (const snap of all) {
    const list = byRepo.get(snap.repoId) ?? [];
    list.push(snap);
    byRepo.set(snap.repoId, list);
  }

  const result = new Map<string, RepoSnapshotPair>();

  for (const [repoId, snaps] of byRepo) {
    const latest = snaps[0];
    if (!latest) continue;

    const inPeriodAsc = snaps
      .filter((s) => s.capturedAt >= since)
      .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());

    let baselineStars = inPeriodAsc[0]?.stars ?? latest.stars;

    if (baselineStars === latest.stars && snaps.length >= 2) {
      baselineStars = snaps[1]?.stars ?? latest.stars;
    }

    result.set(repoId, {
      latest,
      baselineStars,
    });
  }

  return result;
}

export function deltaStarsFromPair(pair: RepoSnapshotPair): number {
  return computeDeltaStars(pair.latest.stars, pair.baselineStars);
}
