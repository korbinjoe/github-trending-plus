import type { FeedItem, SearchResponse } from "@github-trending/core/types";
import { getDb } from "@github-trending/db";
import {
  periodMetrics,
  rankingRuns,
  repositories,
} from "@github-trending/db";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { escapeIlikePattern } from "./search-query";

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
    const pattern = `%${escapeIlikePattern(params.q)}%`;
    conditions.push(
      or(
        ilike(repositories.fullName, pattern),
        ilike(repositories.description, pattern),
      )!,
    );
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

  const latestRun = await db
    .select()
    .from(rankingRuns)
    .where(
      and(
        eq(rankingRuns.period, "today"),
        eq(rankingRuns.view, "velocity"),
        eq(rankingRuns.status, "completed"),
      ),
    )
    .orderBy(desc(rankingRuns.completedAt))
    .limit(1);

  const run = latestRun[0];
  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined;

  const metricJoin = run
    ? and(
        eq(periodMetrics.repoId, repositories.id),
        eq(periodMetrics.rankingRunId, run.id),
      )
    : sql`false`;

  const rows = await db
    .select({
      repo: repositories,
      metric: periodMetrics,
    })
    .from(repositories)
    .leftJoin(periodMetrics, metricJoin)
    .where(whereClause)
    .orderBy(
      desc(sql`coalesce(${periodMetrics.totalStars}, 0)`),
      asc(repositories.fullName),
    )
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
