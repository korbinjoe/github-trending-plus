import {
  SEARCH_MAX_LIMIT,
  SEARCH_MIN_KEYWORD_LENGTH,
  SEARCH_DEFAULT_LIMIT,
} from "@github-trending/core/types";

export function escapeIlikePattern(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function sanitizeSearchQuery(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.trim();
}

export function isKeywordQueryValid(q: string): boolean {
  return q.length >= SEARCH_MIN_KEYWORD_LENGTH;
}

export type SearchParamsInput = {
  q?: string | null;
  tag?: string | null;
  lang?: string | null;
  cursor?: string | null;
  limit?: string | null;
};

export type ParsedSearchParams =
  | {
      ok: true;
      q?: string;
      tag?: string;
      lang?: string;
      offset: number;
      limit: number;
    }
  | { ok: false; status: number; message: string };

export function parseSearchParams(input: SearchParamsInput): ParsedSearchParams {
  const qRaw = sanitizeSearchQuery(input.q);
  const tagRaw = sanitizeSearchQuery(input.tag);
  const langRaw = sanitizeSearchQuery(input.lang);

  const tag = tagRaw || undefined;
  const lang = langRaw || undefined;

  if (!qRaw && !tag) {
    return { ok: false, status: 400, message: "Query or tag is required" };
  }

  if (qRaw && !isKeywordQueryValid(qRaw)) {
    return {
      ok: false,
      status: 400,
      message: `Keyword must be at least ${SEARCH_MIN_KEYWORD_LENGTH} characters`,
    };
  }

  const parsedLimit = input.limit
    ? Number.parseInt(input.limit, 10)
    : SEARCH_DEFAULT_LIMIT;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(1, parsedLimit), SEARCH_MAX_LIMIT)
    : SEARCH_DEFAULT_LIMIT;

  const parsedOffset = input.cursor
    ? Number.parseInt(input.cursor, 10)
    : 0;
  const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0
    ? parsedOffset
    : 0;

  return {
    ok: true,
    q: qRaw || undefined,
    tag,
    lang,
    offset,
    limit,
  };
}
