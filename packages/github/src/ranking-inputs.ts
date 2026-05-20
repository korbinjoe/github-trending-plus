import { shouldExclude, type RepoSignals } from "@github-trending/core";
import type { FeedPeriod } from "@github-trending/core/types";
import type { Database } from "@github-trending/db";
import { repositories } from "@github-trending/db";
import type { IngestLogger } from "./ingest-logger";
import { logEvery } from "./ingest-logger";
import {
  deltaStarsFromPair,
  loadPeriodSnapshotPairs,
  type RepoSnapshotPair,
} from "./ranking-snapshots";

const SCAN_LOG_STEP = 100;

export interface RankingMetricInput {
  repoId: string;
  owner: string;
  name: string;
  language: string | null;
  deltaStars: number;
  totalStars: number;
  commits30d: number;
}

export async function buildRankingInputs(
  db: Database,
  period: FeedPeriod,
  logger?: IngestLogger,
): Promise<RankingMetricInput[]> {
  const repos = await db.select().from(repositories);
  const snapshotPairs = await loadPeriodSnapshotPairs(db, period);
  const inputs: RankingMetricInput[] = [];
  const totalRepos = repos.length;

  logger?.info("ranking_scan_start", { period, totalRepos });

  let scanned = 0;
  for (const repo of repos) {
    scanned += 1;
    const pair = snapshotPairs.get(repo.id);
    if (!pair) continue;

    const signals: RepoSignals = {
      owner: repo.owner,
      name: repo.name,
      topics: (repo.topics as string[]) ?? [],
      commits30d: pair.latest.commits30d,
      totalStars: pair.latest.stars,
    };

    if (shouldExclude(signals)) continue;

    inputs.push({
      repoId: repo.id,
      owner: repo.owner,
      name: repo.name,
      language: repo.language,
      deltaStars: deltaStarsFromPair(pair),
      totalStars: pair.latest.stars,
      commits30d: pair.latest.commits30d,
    });

    if (logger) {
      logEvery(logger, "ranking_scan_progress", scanned, totalRepos, SCAN_LOG_STEP, {
        period,
        candidates: inputs.length,
      });
    }
  }

  logger?.info("ranking_scan_done", {
    period,
    scanned: totalRepos,
    candidates: inputs.length,
  });

  return inputs;
}

export type { RepoSnapshotPair };
