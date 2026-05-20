import { utcDateDaysAgo } from "@github-trending/core";
import type { FeedPeriod } from "@github-trending/core/types";
import { getDb, type Database } from "@github-trending/db";
import { repositories } from "@github-trending/db";
import { asc } from "drizzle-orm";
import { computeAlternativesForPeriod } from "./alternatives";
import type { IngestLogger } from "./ingest-logger";
import { logEvery } from "./ingest-logger";
import { buildRankingInputs } from "./ranking-inputs";
import { runRankingBatch } from "./ranking-batch";
import { OssInsightClient } from "./ossinsight-client";
import {
  hasStarDailyCoverage,
  upsertRepoStarDailyRows,
} from "./repo-star-daily";
import { logIngestError } from "./snapshot-writer";

const HISTORY_LOOKBACK_DAYS = 400;
const STAR_DAILY_BACKFILL_SOURCE = "star-daily-backfill";

export interface StarDailyBackfillOptions {
  logger?: IngestLogger;
  force?: boolean;
  limit?: number;
  ranking?: boolean;
  requestDelayMs?: number;
}

export interface StarDailyBackfillResult {
  reposTotal: number;
  reposProcessed: number;
  reposSkipped: number;
  rowsUpserted: number;
  errors: number;
  rankingRunIds: string[];
}

type RepoRow = typeof repositories.$inferSelect;

const ALL_RANKING_PERIODS: FeedPeriod[] = [
  "today",
  "week",
  "month",
  "halfYear",
  "year",
];

async function backfillRepoStarDaily(
  db: Database,
  client: OssInsightClient,
  repo: RepoRow,
  force: boolean,
): Promise<{ rowsUpserted: number; skipped: boolean; error?: string }> {
  if (!force && (await hasStarDailyCoverage(db, repo.id))) {
    return { rowsUpserted: 0, skipped: true };
  }

  const fromDate = utcDateDaysAgo(HISTORY_LOOKBACK_DAYS);
  const history = await client.fetchStargazerHistory(repo.owner, repo.name, fromDate);

  if (history.length === 0) {
    return { rowsUpserted: 0, skipped: false, error: "no_history" };
  }

  const rowsUpserted = await upsertRepoStarDailyRows(
    db,
    repo.id,
    history,
    "ossinsight",
  );
  return { rowsUpserted, skipped: false };
}

export async function runStarDailyBackfill(
  options?: StarDailyBackfillOptions,
): Promise<StarDailyBackfillResult> {
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
  let rowsUpserted = 0;
  let errors = 0;
  const rankingRunIds: string[] = [];

  logger?.info("star_daily_backfill_start", {
    reposTotal: repos.length,
    force: options?.force ?? false,
    ranking: options?.ranking ?? false,
  });

  for (const repo of repos) {
    reposProcessed += 1;
    try {
      const result = await backfillRepoStarDaily(
        db,
        client,
        repo,
        options?.force ?? false,
      );
      if (result.skipped) {
        reposSkipped += 1;
      } else if (result.error) {
        errors += 1;
        await logIngestError(
          db,
          repo.owner,
          repo.name,
          result.error,
          STAR_DAILY_BACKFILL_SOURCE,
        );
        logger?.warn("star_daily_backfill_no_history", {
          fullName: repo.fullName,
          reason: result.error,
        });
      } else {
        rowsUpserted += result.rowsUpserted;
      }

      if (logger) {
        logEvery(
          logger,
          "star_daily_backfill_progress",
          reposProcessed,
          repos.length,
          25,
          { rowsUpserted, reposSkipped, errors },
        );
      }
    } catch (err) {
      errors += 1;
      const message = err instanceof Error ? err.message : String(err);
      await logIngestError(
        db,
        repo.owner,
        repo.name,
        message,
        STAR_DAILY_BACKFILL_SOURCE,
      );
      logger?.error("star_daily_backfill_repo_failed", {
        fullName: repo.fullName,
        reason: message,
      });
    }
  }

  if (options?.ranking) {
    logger?.info("star_daily_backfill_ranking_start", {
      periods: ALL_RANKING_PERIODS,
    });
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
    logger?.info("star_daily_backfill_ranking_done", { rankingRunIds });
  }

  logger?.info("star_daily_backfill_complete", {
    reposTotal: repos.length,
    reposProcessed,
    reposSkipped,
    rowsUpserted,
    errors,
    rankingRunIds,
  });

  return {
    reposTotal: repos.length,
    reposProcessed,
    reposSkipped,
    rowsUpserted,
    errors,
    rankingRunIds,
  };
}
