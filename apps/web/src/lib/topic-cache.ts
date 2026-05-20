import { unstable_cache } from "next/cache";
import { getSnapshotTopicFilters } from "./topic-service";

export function getCachedSnapshotTopicFilters(): Promise<string[]> {
  return unstable_cache(
    () => getSnapshotTopicFilters(),
    ["snapshot-topic-filters"],
    { revalidate: 300, tags: ["topics", "feed"] },
  )();
}
