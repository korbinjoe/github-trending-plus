import type { FeedResponse } from "@github-trending/core/types";
import { getTranslations } from "next-intl/server";
import type { ParsedFeedParams } from "@/lib/feed-params";
import { buildFeedQuery } from "@/lib/feed-url";
import { Link } from "@/i18n/navigation";
import { RankCardServer, type RankCardLabels } from "./RankCardServer";

interface FeedListServerProps {
  feed: FeedResponse;
  params: ParsedFeedParams;
}

export async function FeedListServer({ feed, params }: FeedListServerProps) {
  const [emptyT, loadMoreT, t, tabT, altT] = await Promise.all([
    getTranslations("empty"),
    getTranslations("feed"),
    getTranslations(),
    getTranslations("tab"),
    getTranslations("alt"),
  ]);
  const cardLabels: RankCardLabels = {
    healthLabel: (health) => t(`health.${health}`),
    earlyLabel: tabT("early"),
    altConsider: altT("consider"),
    altCompare: altT("compare"),
  };
  const items = feed.items ?? [];

  if (items.length === 0) {
    return <p className="feed-empty">{emptyT("feed")}</p>;
  }

  const loadMoreHref = feed.nextCursor
    ? buildFeedQuery(params, feed.nextCursor)
    : null;

  return (
    <section className="feed-section" aria-live="polite">
      <ol className="rank-list">
        {items.map((item) => (
          <RankCardServer
            key={`${item.slug}-${item.rank}`}
            item={item}
            labels={cardLabels}
          />
        ))}
      </ol>
      {loadMoreHref && (
        <div className="feed-load-more">
          <Link href={loadMoreHref} className="btn-ghost" prefetch={false}>
            {loadMoreT("loadMore")}
          </Link>
        </div>
      )}
    </section>
  );
}
