import { errorResponse, jsonResponse, withRateLimit } from "@/lib/api-utils";
import { parseSearchParams } from "@/lib/search-query";
import { searchRepositories } from "@/lib/search-service";
import { SearchResponseSchema } from "@github-trending/core/types";
import { unstable_cache } from "next/cache";

export const revalidate = 60;

export async function GET(request: Request) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams({
    q: searchParams.get("q"),
    tag: searchParams.get("tag"),
    lang: searchParams.get("lang"),
    cursor: searchParams.get("cursor"),
    limit: searchParams.get("limit"),
  });

  if (!parsed.ok) {
    return errorResponse(parsed.message, parsed.status);
  }

  const { q, tag, lang, offset, limit } = parsed;

  const cacheKey = [
    "search",
    q ?? "",
    tag ?? "",
    lang ?? "",
    String(offset),
    String(limit),
  ];

  const cachedSearch = unstable_cache(
    async () => searchRepositories({ q, tag, lang, offset, limit }),
    cacheKey,
    { revalidate: 60, tags: ["search"] },
  );

  try {
    const data = await cachedSearch();
    const validated = SearchResponseSchema.parse(data);
    return jsonResponse(validated, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Search error",
      500,
    );
  }
}
