import {
  buildRankedRepo,
  computeRelativeVelocityPercentile,
  isEarlySignal,
  sortByVelocity,
} from "@github-trending/core";
import type { FeedPeriod, GithubFeedView } from "@github-trending/core/types";
import type { Database } from "@github-trending/db";
import { periodMetrics, rankingRuns } from "@github-trending/db";
import { and, desc, eq, exists } from "drizzle-orm";
import { logEvery, type IngestLogger } from "./ingest-logger";
import { type RankingMetricInput } from "./ranking-inputs";

const WRITE_LOG_STEP = 50;
const INSERT_CHUNK = 100;

export interface RankingBatchResult {
  rankingRunId: string;
  reposRanked: number;
  errorCount: number;
}

/** Mark abandoned runs so feed queries only use completed batches. */
export async function failStaleRankingRuns(db: Database): Promise<number> {
  const updated = await db
    .update(rankingRuns)
    .set({
      status: "failed",
      completedAt: new Date(),
      errorCount: 1,
    })
    .where(eq(rankingRuns.status, "running"))
    .returning({ id: rankingRuns.id });
  return updated.length;
}

export async function runRankingBatch(
  db: Database,
  period: FeedPeriod,
  view: GithubFeedView,
  inputs: RankingMetricInput[],
  logger?: IngestLogger,
): Promise<RankingBatchResult> {
  const [run] = await db
    .insert(rankingRuns)
    .values({ period, view, status: "running" })
    .returning({ id: rankingRuns.id });

  if (!run) throw new Error("Failed to create ranking run");

  try {
    logger?.info("ranking_start", {
      period,
      view,
      rankingRunId: run.id,
      candidates: inputs.length,
    });

    const byLang = new Map<string, number[]>();
    for (const r of inputs) {
      const lang = r.language ?? "unknown";
      const list = byLang.get(lang) ?? [];
      list.push(r.deltaStars);
      byLang.set(lang, list);
    }

    const withRank = inputs.map((r) => {
      const lang = r.language ?? "unknown";
      const pct = computeRelativeVelocityPercentile(
        r.deltaStars,
        byLang.get(lang) ?? [],
      );
      const ranked = buildRankedRepo(
        r.owner,
        r.name,
        r.deltaStars,
        r.totalStars,
        r.commits30d,
        pct,
      );
      ranked.isEarly = isEarlySignal(r.totalStars, pct);
      return { ...r, ranked, percentile: pct };
    });

    let filtered = withRank;
    if (view === "early") {
      filtered = withRank.filter((r) => r.ranked.isEarly);
    }

    const sorted = sortByVelocity(filtered.map((r) => r.ranked));
    const slugToInput = new Map(
      filtered.map((r) => [`${r.owner}/${r.name}`, r]),
    );
    const toWrite = sorted.length;
    const earlyCandidates = withRank.filter((r) => r.ranked.isEarly).length;

    logger?.info("ranking_write_start", {
      period,
      view,
      toWrite,
      earlyCandidates,
    });

    if (earlyCandidates === 0 && view === "early") {
      logger?.warn("early_signal_empty", {
        period,
        hint: "No repos matched stars<5k and top-20% relative growth in this period",
      });
    }

    const rows: (typeof periodMetrics.$inferInsert)[] = [];
    let rank = 1;
    for (const item of sorted) {
      const input = slugToInput.get(`${item.owner}/${item.name}`);
      if (!input) continue;

      rows.push({
        repoId: input.repoId,
        rankingRunId: run.id,
        period,
        view,
        language: input.language,
        deltaStars: item.deltaStars,
        totalStars: item.totalStars,
        commits30d: input.commits30d,
        health: item.health,
        healthScore: item.healthScoreValue,
        velocityRank: rank++,
        isEarlySignal: item.isEarly ? 1 : 0,
        relativeVelocityPercentile: input.percentile,
      });
    }

    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      await db.insert(periodMetrics).values(rows.slice(i, i + INSERT_CHUNK));
      if (logger) {
        logEvery(
          logger,
          "ranking_write_progress",
          Math.min(i + INSERT_CHUNK, rows.length),
          rows.length,
          WRITE_LOG_STEP,
          { period, view },
        );
      }
    }

    const reposRanked = rows.length;

    if (reposRanked === 0) {
      logger?.warn("ranking_empty", {
        period,
        view,
        rankingRunId: run.id,
        candidates: inputs.length,
        hint: "No period_metrics written; run marked failed",
      });
      await db
        .update(rankingRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          reposProcessed: 0,
          errorCount: 1,
        })
        .where(eq(rankingRuns.id, run.id));
      return {
        rankingRunId: run.id,
        reposRanked: 0,
        errorCount: 1,
      };
    }

    logger?.info("ranking_complete", {
      period,
      view,
      rankingRunId: run.id,
      reposRanked,
      earlyCandidates,
    });

    await db
      .update(rankingRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        reposProcessed: reposRanked,
      })
      .where(eq(rankingRuns.id, run.id));

    return {
      rankingRunId: run.id,
      reposRanked,
      errorCount: 0,
    };
  } catch (err) {
    await db
      .update(rankingRuns)
      .set({ status: "failed", completedAt: new Date(), errorCount: 1 })
      .where(eq(rankingRuns.id, run.id));
    throw err;
  }
}

export async function getLatestRankingRunId(
  db: Database,
): Promise<string | null> {
  const rows = await db
    .select({ id: rankingRuns.id })
    .from(rankingRuns)
    .where(
      and(
        eq(rankingRuns.status, "completed"),
        exists(
          db
            .select({ id: periodMetrics.id })
            .from(periodMetrics)
            .where(eq(periodMetrics.rankingRunId, rankingRuns.id)),
        ),
      ),
    )
    .orderBy(desc(rankingRuns.completedAt))
    .limit(1);
  return rows[0]?.id ?? null;
}
