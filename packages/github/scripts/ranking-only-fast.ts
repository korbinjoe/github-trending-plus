/** Skip alternatives (slow) — use when long-period rankings are missing after star-daily backfill. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import type { FeedPeriod } from "@github-trending/core/types";
import { getDb } from "@github-trending/db";
import { defaultIngestLogger } from "../src/ingest-logger";
import { buildRankingInputs } from "../src/ranking-inputs";
import { failStaleRankingRuns, runRankingBatch } from "../src/ranking-batch";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env"),
});

const PERIODS: FeedPeriod[] = ["month", "halfYear", "year"];
const VIEWS = ["velocity", "early"] as const;

async function main(): Promise<void> {
  const logger = defaultIngestLogger;
  const db = getDb();
  const stale = await failStaleRankingRuns(db);
  if (stale > 0) logger.warn("stale_ranking_runs_failed", { count: stale });

  const rankingRunIds: string[] = [];
  for (const period of PERIODS) {
    const inputs = await buildRankingInputs(db, period, logger);
    for (const view of VIEWS) {
      const result = await runRankingBatch(db, period, view, inputs, logger);
      rankingRunIds.push(result.rankingRunId);
      logger.info("fast_ranking_period_done", {
        period,
        view,
        reposRanked: result.reposRanked,
      });
    }
  }
  logger.info("fast_ranking_all_done", { rankingRunIds });
  console.log("OK", rankingRunIds);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
