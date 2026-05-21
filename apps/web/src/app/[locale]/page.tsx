import { PhPeriodDefault } from "@/components/feed/PhPeriodDefault";
import { FeedListSkeleton } from "@/components/feed/FeedListSkeleton";
import { FeedLoadingProvider } from "@/components/feed/FeedLoadingContext";
import { FilterBar } from "@/components/feed/FilterBar";
import { HomeFeedBlock } from "@/components/home/HomeFeedBlock";
import { Hero } from "@/components/layout/Hero";
import { parseFeedParams } from "@/lib/feed-params";
import { getCachedLatestCompletedRun } from "@/lib/ranking-run-cache";
import { getCachedSnapshotTopicFilters } from "@/lib/topic-cache";
import { toIsoString } from "@/lib/timestamp";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
  const [topicFilters, run, feedT] = await Promise.all([
    getCachedSnapshotTopicFilters().catch(() => [] as string[]),
    feedParams.view === "ph"
      ? Promise.resolve(null)
      : getCachedLatestCompletedRun(feedParams.period, feedParams.view),
    getTranslations("feed"),
  ]);
  const updatedAt = toIsoString(run?.completedAt);

  return (
    <FeedLoadingProvider>
      <PhPeriodDefault />
      <Hero updatedAt={updatedAt} />
      <FilterBar topicFilters={topicFilters} />
      <Suspense
        fallback={
          <section className="feed-section">
            <FeedListSkeleton label={feedT("loading")} />
          </section>
        }
      >
        <HomeFeedBlock feedParams={feedParams} />
      </Suspense>
    </FeedLoadingProvider>
  );
}
