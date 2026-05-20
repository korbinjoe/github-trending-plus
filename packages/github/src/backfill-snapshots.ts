import {
  BACKFILL_ANCHOR_DAYS,
  capturedAtEndOfUtcDay,
  periodStart,
  pickStarsAtOrBefore,
  utcDateDaysAgo,
} from "@github-trending/core";
import type { FeedPeriod } from "@github-trending/core/types";
import { getDb, type Database } from "@github-trending/db";
import { repositories, repositorySnapshots } from "@github-trending/db";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import type { IngestLogger } from "./ingest-logger";
import { logEvery } from "./ingest-logger";
import { OssInsightClient } from "./ossinsight-client";
import { buildRankingInputs } from "./ranking-inputs";
import { runRankingBatch } from "./ranking-batch";
import { computeAlternativesForPeriod } from "./alternatives";

const HISTORY_LOOKBACK_DAYS = 400;
const SNAPSHOT_NEAR_DAYS = 2;

export interface BackfillOptions {
  logger?: IngestLogger;
  force?: boolean;
  limit?: number;
  ranking?: boolean;
  requestDelayMs?: number;
}

export interface BackfillResult {
  reposTotal: number;
  reposProcessed: number;
  reposSkipped: number;
  snapshotsInserted: number;
  errors: number;
  rankingRunIds: string[];
}

type RepoRow = typeof repositories.$inferSelect;
type SnapshotRow = typeof repositorySnapshots.$inferSelect;

async function getLatestSnapshot(
  db: Database,
  repoId: string,
): Promise<SnapshotRow | null> {
  const rows = await db
    .select()
    .from(repositorySnapshots)
    .where(eq(repositorySnapshots.repoId, repoId))
    .orderBy(desc(repositorySnapshots.capturedAt))
    .limit(1);
  return rows[0] ?? null;
}

async function hasBaselineForYear(
  db: Database,
  repoId: string,
): Promise<boolean> {
  const cutoff = periodStart("year");
  const rows = await db
    .select({ id: repositorySnapshots.id })
    .from(repositorySnapshots)
    .where(
      and(
        eq(repositorySnapshots.repoId, repoId),
        lte(repositorySnapshots.capturedAt, cutoff),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function hasSnapshotNearDate(
  db: Database,
  repoId: string,
  dateStr: string,
): Promise<boolean> {
  const center = capturedAtEndOfUtcDay(dateStr);
  const start = new Date(center);
  start.setUTCDate(start.getUTCDate() - SNAPSHOT_NEAR_DAYS);
  const end = new Date(center);
  end.setUTCDate(end.getUTCDate() + SNAPSHOT_NEAR_DAYS);

  const rows = await db
    .select({ id: repositorySnapshots.id })
    .from(repositorySnapshots)
    .where(
      and(
        eq(repositorySnapshots.repoId, repoId),
        gte(repositorySnapshots.capturedAt, start),
        lte(repositorySnapshots.capturedAt, end),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function insertBackfillSnapshot(
  db: Database,
  repoId: string,
  stars: number,
  capturedAt: Date,
  template: SnapshotRow | null,
): Promise<void> {
  await db.insert(repositorySnapshots).values({
    repoId,
    stars,
    forks: template?.forks ?? 0,
    openIssues: template?.openIssues ?? 0,
    commits30d: template?.commits30d ?? 0,
    pushedAt: template?.pushedAt ?? null,
    capturedAt,
  });
}

async function backfillRepo(
  db: Database,
  client: OssInsightClient,
  repo: RepoRow,
  force: boolean,
): Promise<{ inserted: number; skipped: boolean; error?: string }> {
  if (!force && (await hasBaselineForYear(db, repo.id))) {
    return { inserted: 0, skipped: true };
  }

  const template = await getLatestSnapshot(db, repo.id);
  const fromDate = utcDateDaysAgo(HISTORY_LOOKBACK_DAYS);
  const history = await client.fetchStargazerHistory(repo.owner, repo.name, fromDate);

  if (history.length === 0) {
    return { inserted: 0, skipped: false, error: "no_history" };
  }

  let inserted = 0;
  for (const daysAgo of BACKFILL_ANCHOR_DAYS) {
    const anchorDate = utcDateDaysAgo(daysAgo);
    if (!force && (await hasSnapshotNearDate(db, repo.id, anchorDate))) {
      continue;
    }

    const stars = pickStarsAtOrBefore(history, anchorDate);
    if (stars === null) continue;

    await insertBackfillSnapshot(
      db,
      repo.id,
      stars,
      capturedAtEndOfUtcDay(anchorDate),
      template,
    );
    inserted += 1;
  }

  return { inserted, skipped: false };
}

const ALL_RANKING_PERIODS: FeedPeriod[] = [
  "today",
  "week",
  "month",
  "halfYear",
  "year",
];

export async function runSnapshotBackfill(
  options?: BackfillOptions,
): Promise<BackfillResult> {
  const logger = options?.logger;
  const db = getDb();
  const client = new OssInsightClient({
    requestDelayMs: options?.requestDelayMs,
  });

  const baseQuery = db
    .select()
    .from(repositories)
    .orderBy(asc(repositories.fullName));
  const repos = options?.limit
    ? await baseQuery.limit(options.limit)
    : await baseQuery;

  let reposProcessed = 0;
  let reposSkipped = 0;
  let snapshotsInserted = 0;
  let errors = 0;
  const rankingRunIds: string[] = [];

  logger?.info("backfill_start", {
    reposTotal: repos.length,
    force: options?.force ?? false,
    ranking: options?.ranking ?? false,
  });

  for (const repo of repos) {
    reposProcessed += 1;
    try {
      const result = await backfillRepo(
        db,
        client,
        repo,
        options?.force ?? false,
      );
      if (result.skipped) {
        reposSkipped += 1;
      } else if (result.error) {
        errors += 1;
        logger?.warn("backfill_repo_no_history", {
          fullName: repo.fullName,
          reason: result.error,
        });
      } else {
        snapshotsInserted += result.inserted;
      }

      if (logger) {
        logEvery(
          logger,
          "backfill_progress",
          reposProcessed,
          repos.length,
          25,
          {
            snapshotsInserted,
            reposSkipped,
            errors,
          },
        );
      }
    } catch (err) {
      errors += 1;
      logger?.error("backfill_repo_failed", {
        fullName: repo.fullName,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (options?.ranking) {
    logger?.info("backfill_ranking_start", { periods: ALL_RANKING_PERIODS });
    const views = ["velocity", "early"] as const;
    for (const period of ALL_RANKING_PERIODS) {
      const inputs = await buildRankingInputs(db, period, logger);
      let velocityRunId: string | null = null;
      for (const view of views) {
        const result = await runRankingBatch(db, period, view, inputs, logger);
        rankingRunIds.push(result.rankingRunId);
        if (view === "velocity") velocityRunId = result.rankingRunId;
      }
      if (velocityRunId) {
        await computeAlternativesForPeriod(db, period, velocityRunId);
      }
    }
    logger?.info("backfill_ranking_done", { rankingRunIds });
  }

  logger?.info("backfill_complete", {
    reposTotal: repos.length,
    reposProcessed,
    reposSkipped,
    snapshotsInserted,
    errors,
    rankingRunIds,
  });

  return {
    reposTotal: repos.length,
    reposProcessed,
    reposSkipped,
    snapshotsInserted,
    errors,
    rankingRunIds,
  };
}
