import { FeedListServer } from "@/components/feed/FeedListServer";
import { FilterBar } from "@/components/feed/FilterBar";
import { Hero } from "@/components/layout/Hero";
import { getCachedFeed } from "@/lib/cached-feed";
import { parseFeedParams } from "@/lib/feed-params";
import { getCachedSnapshotTopicFilters } from "@/lib/topic-cache";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

export const revalidate = 300;

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const feedParams = parseFeedParams(sp);
  const [topicFilters, feed] = await Promise.all([
    getCachedSnapshotTopicFilters().catch(() => [] as string[]),
    getCachedFeed(feedParams).catch(() => ({
      items: [],
      nextCursor: null,
      rankingRunId: null,
      updatedAt: null,
    })),
  ]);

  return (
    <>
      <Hero updatedAt={feed.updatedAt} />
      <Suspense fallback={null}>
        <FilterBar topicFilters={topicFilters} />
      </Suspense>
      <FeedListServer feed={feed} params={feedParams} />
    </>
  );
}
