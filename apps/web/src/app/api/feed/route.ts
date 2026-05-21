import { errorResponse, jsonResponse, withRateLimit } from "@/lib/api-utils";
import { getCachedFeed } from "@/lib/cached-feed";
import { getCachedPhFeed } from "@/lib/cached-ph-feed";
import { parseFeedParams } from "@/lib/feed-params";

export const revalidate = 300;

export async function GET(request: Request) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const parsed = parseFeedParams(
    Object.fromEntries(searchParams.entries()),
  );

  try {
    const data =
      parsed.view === "ph"
        ? await getCachedPhFeed(parsed)
        : await getCachedFeed(parsed);
    const tag =
      parsed.view === "ph"
        ? "ph"
        : ("rankingRunId" in data ? data.rankingRunId : null) ?? "none";
    return jsonResponse(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Ranking-Run-Id": tag,
      },
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Feed error",
      500,
    );
  }
}
