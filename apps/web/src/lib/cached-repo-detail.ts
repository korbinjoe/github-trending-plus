import { FeedPeriodSchema } from "@github-trending/core/types";
import { unstable_cache } from "next/cache";
import {
  getRepoAlternatives,
  getRepoDetailCore,
  getRepoDetail,
} from "./repo-service";

function periodCacheKey(period?: string): string {
  const parsed = FeedPeriodSchema.safeParse(period);
  return parsed.success ? parsed.data : "today";
}

function detailCacheKey(owner: string, name: string, period?: string): string[] {
  return [
    "repo-detail",
    owner.toLowerCase(),
    name.toLowerCase(),
    periodCacheKey(period),
  ];
}

/** Cached core repo detail (SSR + prefetch). */
export function getCachedRepoDetailCore(
  owner: string,
  name: string,
  period?: string,
) {
  return unstable_cache(
    () => getRepoDetailCore(owner, name, period),
    detailCacheKey(owner, name, period),
    { revalidate: 600, tags: ["repo-detail"] },
  )();
}

/** Cached alternatives panel data (streamed via Suspense). */
export function getCachedRepoAlternatives(
  owner: string,
  name: string,
  period?: string,
) {
  return unstable_cache(
    () => getRepoAlternatives(owner, name, period),
    ["repo-alts", ...detailCacheKey(owner, name, period)],
    { revalidate: 600, tags: ["repo-detail"] },
  )();
}

/** Full detail for API routes. */
export function getCachedRepoDetail(
  owner: string,
  name: string,
  period?: string,
) {
  return unstable_cache(
    () => getRepoDetail(owner, name, period),
    ["repo-detail-full", ...detailCacheKey(owner, name, period)],
    { revalidate: 600, tags: ["repo-detail"] },
  )();
}
