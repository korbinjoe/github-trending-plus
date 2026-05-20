import { HomeFeed } from "@/components/home/HomeFeed";
import { getSnapshotTopicFilters } from "@/lib/topic-service";
import { setRequestLocale } from "next-intl/server";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  let topicFilters: string[] = [];
  try {
    topicFilters = await getSnapshotTopicFilters();
  } catch {
    topicFilters = [];
  }

  return <HomeFeed topicFilters={topicFilters} />;
}
