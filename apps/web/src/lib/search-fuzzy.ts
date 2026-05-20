import { repositories } from "@github-trending/db";
import { ilike, or, sql, type SQL } from "drizzle-orm";
import { escapeIlikePattern } from "./search-query";

export const DEFAULT_SEARCH_FUZZY_THRESHOLD = 0.25;

export function getSearchFuzzyThreshold(): number {
  const raw = process.env.SEARCH_FUZZY_THRESHOLD;
  if (!raw) return DEFAULT_SEARCH_FUZZY_THRESHOLD;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
    return DEFAULT_SEARCH_FUZZY_THRESHOLD;
  }
  return parsed;
}

export function buildKeywordMatchCondition(
  q: string,
  _threshold: number,
): SQL {
  const qLower = q.toLowerCase();
  const pattern = `%${escapeIlikePattern(q)}%`;
  const nameLower = sql`lower(${repositories.fullName})`;
  const descLower = sql`lower(coalesce(${repositories.description}, ''))`;

  // Filter: trigram % + ILIKE use GIN indexes; similarity() in WHERE forces seq scans.
  return or(
    sql`${nameLower} % ${qLower}`,
    sql`${descLower} % ${qLower}`,
    ilike(repositories.fullName, pattern),
    ilike(repositories.description, pattern),
  )!;
}

/** Relevance for ORDER BY when keyword `q` is present. */
export function buildKeywordRelevanceSql(q: string, threshold: number): SQL {
  const qLower = q.toLowerCase();
  const pattern = `%${escapeIlikePattern(q)}%`;
  const minRelevance = threshold;
  const descLower = sql`lower(coalesce(${repositories.description}, ''))`;

  const nameLower = sql`lower(${repositories.fullName})`;
  const nameSim = sql`similarity(${nameLower}, ${qLower})`;
  const descSim = sql`similarity(${descLower}, ${qLower})`;
  const descWordSim = sql`word_similarity(${qLower}, ${descLower})`;
  const nameSubstring = ilike(repositories.fullName, pattern);
  const descSubstring = ilike(repositories.description, pattern);

  return sql`GREATEST(
    CASE WHEN ${nameSubstring} THEN ${minRelevance} ELSE ${nameSim} END,
    CASE WHEN ${descSubstring} THEN ${minRelevance} ELSE GREATEST(${descSim}, ${descWordSim}) END
  )`;
}
