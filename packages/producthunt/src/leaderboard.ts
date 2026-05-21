import type { PhGithubFilter } from "@github-trending/core/types";
import type { Database } from "@github-trending/db";
import { productHuntPosts } from "@github-trending/db";
import { and, desc, gte, isNotNull, sql } from "drizzle-orm";

export type PhLeaderboardRow = typeof productHuntPosts.$inferSelect;

const DEFAULT_PAGE_SIZE = 24;

export interface PhLeaderboardQuery {
  postedAfter: Date;
  phGithub?: PhGithubFilter;
  topic?: string;
  cursor?: number;
  limit?: number;
}

export interface PhLeaderboardPage {
  rows: PhLeaderboardRow[];
  nextCursor: string | null;
}

export async function getPhLeaderboardPosts(
  db: Database,
  query: PhLeaderboardQuery,
): Promise<PhLeaderboardPage> {
  const limit = query.limit ?? DEFAULT_PAGE_SIZE;
  const offset = query.cursor ?? 0;
  const fetchLimit = limit + 1;

  const conditions = [gte(productHuntPosts.postedAt, query.postedAfter)];

  if (query.phGithub === "linked") {
    conditions.push(isNotNull(productHuntPosts.githubOwner));
  }

  if (query.topic) {
    const topicLower = query.topic.toLowerCase();
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${productHuntPosts.topics}) AS elem
        WHERE lower(elem::text) = ${topicLower}
      )`,
    );
  }

  const rows = await db
    .select()
    .from(productHuntPosts)
    .where(and(...conditions))
    .orderBy(
      desc(productHuntPosts.votesCount),
      desc(productHuntPosts.postedAt),
    )
    .offset(offset)
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextOffset = offset + limit;

  return {
    rows: page,
    nextCursor: hasMore ? String(nextOffset) : null,
  };
}
