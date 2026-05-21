import { FeedListClient } from "@/components/feed/FeedListClient";
import { getCachedFeed } from "@/lib/cached-feed";
import { getCachedPhFeed } from "@/lib/cached-ph-feed";
import type { ParsedFeedParams } from "@/lib/feed-params";

interface HomeFeedBlockProps {
  feedParams: ParsedFeedParams;
}

export async function HomeFeedBlock({ feedParams }: HomeFeedBlockProps) {
  if (feedParams.view === "ph") {
    const phFeed = await getCachedPhFeed({
      ...feedParams,
      cursor: undefined,
    }).catch(() => ({
      items: [],
      nextCursor: null,
      updatedAt: null,
    }));

    return <FeedListClient initialPhFeed={phFeed} />;
  }

  const feed = await getCachedFeed({
    ...feedParams,
    cursor: undefined,
  }).catch(() => ({
    items: [],
    nextCursor: null,
    rankingRunId: null,
    updatedAt: null,
  }));

  return <FeedListClient initialFeed={feed} />;
}
