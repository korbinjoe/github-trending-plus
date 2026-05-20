import { errorResponse, jsonResponse, withRateLimit } from "@/lib/api-utils";
import { getCachedSnapshotTopicFilters } from "@/lib/topic-cache";
import { unstable_cache } from "next/cache";

export const revalidate = 300;

export async function GET(request: Request) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  const cached = unstable_cache(
    async () => {
      const topics = await getCachedSnapshotTopicFilters();
      return { topics };
    },
    ["snapshot-topic-filters"],
    { revalidate: 300, tags: ["topics", "feed"] },
  );

  try {
    const data = await cached();
    return jsonResponse(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Topics error",
      500,
    );
  }
}
