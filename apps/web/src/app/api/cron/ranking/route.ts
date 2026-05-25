import { errorResponse, jsonResponse, validateCronSecret } from "@/lib/api-utils";
import {
  computeAlternativesForPeriod,
  runRankingBatch,
  failStaleRankingRuns,
  buildRankingInputs,
} from "@github-trending/github";
import { getDb } from "@github-trending/db";
import { revalidateTag } from "next/cache";
import type { FeedPeriod } from "@github-trending/core/types";

export const maxDuration = 300;

const rankingLogger = {
  info: (msg: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: "info", msg, ...meta }));
  },
  error: (msg: string, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: "error", msg, ...meta }));
  },
  warn: (msg: string, meta?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: "warn", msg, ...meta }));
  },
};

export async function GET(request: Request) {
  return handleRanking(request);
}

export async function POST(request: Request) {
  return handleRanking(request);
}

async function handleRanking(request: Request) {
  if (!validateCronSecret(request)) {
    return errorResponse("Unauthorized", 401);
  }

  const db = getDb();
  const started = Date.now();

  rankingLogger.info("cron_ranking_start");

  try {
    const stale = await failStaleRankingRuns(db);
    if (stale > 0) {
      rankingLogger.warn("stale_ranking_runs_failed", { count: stale });
    }

    const periods: FeedPeriod[] = [
      "today",
      "week",
      "month",
    ];
    const views = ["velocity", "early"] as const;
    const rankingRunIds: string[] = [];

    rankingLogger.info("ranking_phase_start", {
      periods,
      views: ["velocity", "early"],
    });

    for (const period of periods) {
      const inputs = await buildRankingInputs(db, period, rankingLogger);
      let velocityRunId: string | null = null;
      for (const view of views) {
        const result = await runRankingBatch(
          db,
          period,
          view,
          inputs,
          rankingLogger,
        );
        rankingRunIds.push(result.rankingRunId);
        if (view === "velocity") {
          velocityRunId = result.rankingRunId;
        }
      }
      if (velocityRunId) {
        rankingLogger.info("alternatives_start", {
          period,
          rankingRunId: velocityRunId,
        });
        const edges = await computeAlternativesForPeriod(
          db,
          period,
          velocityRunId,
        );
        rankingLogger.info("alternatives_done", {
          period,
          edgesWritten: edges,
        });
      }
    }

    revalidateTag("feed");
    revalidateTag("ranking");
    revalidateTag("topics");

    rankingLogger.info("cron_ranking_complete", {
      durationMs: Date.now() - started,
      rankingRunIds,
    });

    return jsonResponse({
      ok: true,
      rankingRunIds,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    rankingLogger.error("cron_ranking_failed", {
      durationMs: Date.now() - started,
      reason: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(
      err instanceof Error ? err.message : "Ranking failed",
      500,
    );
  }
}