import type { FeedResponse } from "@github-trending/core/types";
import { getTranslations } from "next-intl/server";
import type { ParsedFeedParams } from "@/lib/feed-params";
import { buildFeedQuery } from "@/lib/feed-url";
import { Link } from "@/i18n/navigation";
import { RankCardServer } from "./RankCardServer";

interface FeedListServerProps {
  feed: FeedResponse;
  params: ParsedFeedParams;
}

export async function FeedListServer({ feed, params }: FeedListServerProps) {
  const emptyT = await getTranslations("empty");
  const loadMoreT = await getTranslations("feed");
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
          <RankCardServer key={`${item.slug}-${item.rank}`} item={item} />
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
