import {
  computeDeltaStars,
  periodBaselineDate,
  periodStart,
  resolveBaselineStars,
  utcDateDaysAgo,
} from "@github-trending/core";
import type { FeedPeriod } from "@github-trending/core/types";
import type { Database } from "@github-trending/db";
import { repositorySnapshots } from "@github-trending/db";
import { desc, sql } from "drizzle-orm";
import { loadAllRepoStarDailyByRepo } from "./repo-star-daily";

export { periodStart } from "@github-trending/core";

const STAR_DAILY_LOOKBACK_DAYS = 400;

type SnapshotRow = typeof repositorySnapshots.$inferSelect;

export interface RepoSnapshotPair {
  latest: SnapshotRow;
  baselineStars: number;
}

type LatestWithBaselineRow = {
  id: string;
  repo_id: string;
  stars: number;
  forks: number;
  open_issues: number;
  commits_30d: number;
  pushed_at: Date | null;
  captured_at: Date;
  baseline_stars: number;
};

/** SQL join: latest snapshot + daily baseline at period start (no full-table load). */
async function loadPeriodPairsWithDailyBaseline(
  db: Database,
  period: FeedPeriod,
): Promise<Map<string, RepoSnapshotPair>> {
  const baselineDate = periodBaselineDate(period);
  const rows = await db.execute<LatestWithBaselineRow>(sql`
    WITH latest AS (
      SELECT DISTINCT ON (repo_id)
        id,
        repo_id,
        stars,
        forks,
        open_issues,
        commits_30d,
        pushed_at,
        captured_at
      FROM repository_snapshots
      ORDER BY repo_id, captured_at DESC
    ),
    baseline AS (
      SELECT DISTINCT ON (repo_id)
        repo_id,
        stars AS baseline_stars
      FROM repo_star_daily
      WHERE date <= ${baselineDate}
      ORDER BY repo_id, date DESC
    )
    SELECT
      l.id,
      l.repo_id,
      l.stars,
      l.forks,
      l.open_issues,
      l.commits_30d,
      l.pushed_at,
      l.captured_at,
      COALESCE(b.baseline_stars, l.stars) AS baseline_stars
    FROM latest l
    LEFT JOIN baseline b ON l.repo_id = b.repo_id
  `);

  const result = new Map<string, RepoSnapshotPair>();
  for (const row of rows) {
    result.set(row.repo_id, {
      latest: {
        id: row.id,
        repoId: row.repo_id,
        stars: row.stars,
        forks: row.forks,
        openIssues: row.open_issues,
        commits30d: row.commits_30d,
        pushedAt: row.pushed_at,
        capturedAt: row.captured_at,
      },
      baselineStars: row.baseline_stars,
    });
  }
  return result;
}

/** Snapshot pairs with daily-star baseline for week–year periods. */
export async function loadPeriodSnapshotPairs(
  db: Database,
  period: FeedPeriod,
): Promise<Map<string, RepoSnapshotPair>> {
  if (period === "today") {
    return loadRepoSnapshotPairs(db, period);
  }

  try {
    return await loadPeriodPairsWithDailyBaseline(db, period);
  } catch {
    const pairs = await loadRepoSnapshotPairs(db, period);
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
