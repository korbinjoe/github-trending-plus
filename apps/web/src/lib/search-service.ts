import type { FeedItem, SearchResponse } from "@github-trending/core/types";
import { getDb } from "@github-trending/db";
import { periodMetrics, repositories } from "@github-trending/db";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";

/** Cap rows scored for keyword search (avoids sorting the full table). */
const SEARCH_CANDIDATE_CAP = 400;
import { getCachedLatestCompletedRun } from "./ranking-run-cache";
import {
  buildKeywordMatchCondition,
  buildKeywordRelevanceSql,
  getSearchFuzzyThreshold,
} from "./search-fuzzy";

export async function searchRepositories(params: {
  q?: string;
  tag?: string;
  lang?: string;
  offset: number;
  limit: number;
}): Promise<SearchResponse> {
  const db = getDb();
  const conditions: SQL[] = [];

  if (params.q) {
    const threshold = getSearchFuzzyThreshold();
    conditions.push(buildKeywordMatchCondition(params.q, threshold));
  }

  if (params.tag) {
    const tagLower = params.tag.toLowerCase();
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${repositories.topics}) AS elem
        WHERE lower(elem::text) = ${tagLower}
      )`,
    );
  }

  if (params.lang) {
    conditions.push(eq(repositories.language, params.lang));
  }

  const run = await getCachedLatestCompletedRun("today", "velocity");
  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined;

  const metricJoin = run
    ? and(
        eq(periodMetrics.repoId, repositories.id),
        eq(periodMetrics.rankingRunId, run.id),
      )
    : sql`false`;

  const orderBy =
    params.q != null && params.q.length > 0
      ? [
          desc(buildKeywordRelevanceSql(params.q, getSearchFuzzyThreshold())),
          desc(sql`coalesce(${periodMetrics.totalStars}, 0)`),
          asc(repositories.fullName),
        ]
      : [
          desc(sql`coalesce(${periodMetrics.totalStars}, 0)`),
          asc(repositories.fullName),
        ];

  let candidateIds: string[] | null = null;
  if (params.q && whereClause) {
    const candidates = await db
      .select({ id: repositories.id })
      .from(repositories)
      .where(whereClause)
      .limit(SEARCH_CANDIDATE_CAP);
    candidateIds = candidates.map((c) => c.id);
    if (candidateIds.length === 0) {
      return { items: [], nextCursor: null };
    }
  }

  const scopedWhere = candidateIds
    ? and(whereClause, inArray(repositories.id, candidateIds))
    : whereClause;

  const rows = await db
    .select({
      repo: repositories,
      metric: periodMetrics,
    })
    .from(repositories)
    .leftJoin(periodMetrics, metricJoin)
    .where(scopedWhere)
    .orderBy(...orderBy)
    .offset(params.offset)
    .limit(params.limit + 1);

  const hasMore = rows.length > params.limit;
  const page = hasMore ? rows.slice(0, params.limit) : rows;

  const items: FeedItem[] = page.map(({ repo, metric }, index) => {
    const topics = (repo.topics as string[]) ?? [];
    const rank = params.offset + index + 1;

    return {
      rank,
      owner: repo.owner,
      name: repo.name,
      slug: `${repo.owner}/${repo.name}`,
      description: repo.description ?? "",
      deltaStars: metric?.deltaStars ?? 0,
      totalStars: metric?.totalStars ?? 0,
      health: metric?.health ?? "low",
      tags: topics.slice(0, 5),
      isEarlySignal: metric?.isEarlySignal === 1,
      alternatives: [],
    };
  });

  return {
    items,
    nextCursor: hasMore ? String(params.offset + params.limit) : null,
  };
}
