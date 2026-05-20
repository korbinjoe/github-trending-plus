import { getDb } from "@github-trending/db";
import type { FeedPeriod } from "@github-trending/core/types";
import { computeAlternativesForPeriod } from "./alternatives";
import { GitHubGraphQLClient, GitHubRateLimitError } from "./client";
import { INGEST_LANGUAGES } from "./config";
import {
  defaultIngestLogger,
  logEvery,
  type IngestLogger,
} from "./ingest-logger";
import { buildRankingInputs } from "./ranking-inputs";
import { failStaleRankingRuns, runRankingBatch } from "./ranking-batch";
import { searchCandidatesForLanguage } from "./search";
import { logIngestError, upsertRepositorySnapshot } from "./snapshot-writer";

export type { IngestLogger } from "./ingest-logger";

export interface IngestResult {
  reposIngested: number;
  errors: number;
  rankingRunIds: string[];
}

const SNAPSHOT_LOG_STEP = 50;

export async function runIngest(
  options?: { ranking?: boolean; rankingOnly?: boolean; logger?: IngestLogger },
): Promise<IngestResult> {
  const logger = options?.logger ?? defaultIngestLogger;
  const db = getDb();
  const client = new GitHubGraphQLClient();

  let reposIngested = 0;
  let errors = 0;
  const rankingRunIds: string[] = [];

  if (options?.rankingOnly && !options.ranking) {
    throw new Error("--ranking-only requires --ranking");
  }

  if (options?.rankingOnly) {
    logger.info("ingest_skipped", { reason: "ranking_only" });
  } else {
    logger.info("ingest_start", { languages: INGEST_LANGUAGES });
  }

  for (const language of INGEST_LANGUAGES) {
    if (options?.rankingOnly) break;
    try {
      logger.info("ingest_language_start", { language });
      const nodes = await searchCandidatesForLanguage(client, language, undefined, logger);
      const total = nodes.length;
      let saved = 0;

      for (const node of nodes) {
        try {
          await upsertRepositorySnapshot(db, node);
          reposIngested += 1;
          saved += 1;
          logEvery(logger, "ingest_snapshot_progress", saved, total, SNAPSHOT_LOG_STEP, {
            language,
            errors,
          });
        } catch (err) {
          errors += 1;
          const [owner, name] = node.nameWithOwner.split("/");
          await logIngestError(
            db,
            owner ?? null,
            name ?? null,
            err instanceof Error ? err.message : String(err),
          );
        }
      }

      logger.info("ingest_language_done", { language, saved, total, errors });
    } catch (err) {
      if (err instanceof GitHubRateLimitError) {
        logger.error("rate_limit", { resetAt: err.resetAt, language });
        errors += 1;
        continue;
      }
      throw err;
    }
  }

  if (options?.ranking) {
    const stale = await failStaleRankingRuns(db);
    if (stale > 0) {
      logger.warn("stale_ranking_runs_failed", { count: stale });
    }

    const periods: FeedPeriod[] = [
      "today",
      "week",
      "month",
      "halfYear",
      "year",
    ];
    logger.info("ranking_phase_start", {
      periods,
      views: ["velocity", "early"],
    });
    const views = ["velocity", "early"] as const;
    for (const period of periods) {
      const inputs = await buildRankingInputs(db, period, logger);
      let velocityRunId: string | null = null;
      for (const view of views) {
        const result = await runRankingBatch(db, period, view, inputs, logger);
        rankingRunIds.push(result.rankingRunId);
        if (view === "velocity") {
          velocityRunId = result.rankingRunId;
        }
      }
      if (velocityRunId) {
        logger.info("alternatives_start", { period, rankingRunId: velocityRunId });
        const edges = await computeAlternativesForPeriod(
          db,
          period,
          velocityRunId,
        );
        logger.info("alternatives_done", { period, edgesWritten: edges });
      }
    }
    logger.info("ranking_phase_done", { rankingRunIds });
  }

  logger.info("ingest_complete", { reposIngested, errors, rankingRunIds });

  return { reposIngested, errors, rankingRunIds };
}
