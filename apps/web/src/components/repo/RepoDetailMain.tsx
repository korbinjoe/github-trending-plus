import type { FeedPeriod } from "@github-trending/core/types";
import { RepoDetailView } from "@/components/repo/RepoDetailView";
import { getCachedRepoReadmeMarkdown } from "@/lib/cached-github-readme";
import { getCachedRepoDetailCore } from "@/lib/cached-repo-detail";
import { parseFeedPeriod } from "@/lib/feed-params";
import { notFound } from "next/navigation";

const PERIOD_LABEL_KEYS: Record<FeedPeriod, "filter.today" | "filter.week" | "filter.month" | "filter.halfYear" | "filter.year"> = {
  today: "filter.today",
  week: "filter.week",
  month: "filter.month",
  halfYear: "filter.halfYear",
  year: "filter.year",
};

interface RepoDetailMainProps {
  owner: string;
  name: string;
  period?: string;
  locale: string;
}

export async function RepoDetailMain({
  owner,
  name,
  period,
  locale,
}: RepoDetailMainProps) {
  const [detail, readmeMarkdown] = await Promise.all([
    getCachedRepoDetailCore(owner, name, period),
    getCachedRepoReadmeMarkdown(owner, name),
  ]);
  if (!detail) notFound();

  const feedPeriod = parseFeedPeriod(period);

  return (
    <RepoDetailView
      detail={detail}
      locale={locale}
      readmeMarkdown={readmeMarkdown}
      periodLabelKey={PERIOD_LABEL_KEYS[feedPeriod]}
    />
  );
}
