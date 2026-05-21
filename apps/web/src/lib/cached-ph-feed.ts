import type { PhFeedResponse } from "@github-trending/core/types";
import { unstable_cache } from "next/cache";
import type { ParsedFeedParams } from "./feed-params";
import { getPhFeed } from "./ph-feed-service";

function phFeedCacheKey(params: ParsedFeedParams): string[] {
  return [
    "ph-feed",
    params.period,
    params.phGithub,
    params.lang ?? "",
    params.topic ?? "",
    params.cursor ?? "",
    String(params.includeNoise),
  ];
}

export function getCachedPhFeed(
  params: ParsedFeedParams,
): Promise<PhFeedResponse> {
  return unstable_cache(
    () =>
      getPhFeed({
        period: params.period,
        phGithub: params.phGithub,
        lang: params.lang,
        topic: params.topic,
        cursor: params.cursor,
        includeNoise: params.includeNoise,
      }),
    phFeedCacheKey(params),
    { revalidate: 300, tags: ["feed", "ph-feed"] },
  )();
}
