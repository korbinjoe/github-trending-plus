"use client";

import type { FeedItem, FeedResponse } from "@github-trending/core/types";
import { useTranslations } from "next-intl";
import {
  parseAsBoolean,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
} from "nuqs";
import { useCallback, useEffect, useState } from "react";
import { FeedListSkeleton } from "./FeedListSkeleton";
import { RankCard } from "./RankCard";

interface FeedListProps {
  onUpdatedAt?: (updatedAt: string | null) => void;
}

export function FeedList({ onUpdatedAt }: FeedListProps) {
  const t = useTranslations("empty");
  const loadMoreT = useTranslations("feed");
  const [view] = useQueryState(
    "view",
    parseAsStringEnum(["velocity", "early"]).withDefault("velocity"),
  );
  const [period] = useQueryState(
    "period",
    parseAsStringEnum(["today", "week", "month", "halfYear", "year"]).withDefault(
      "today",
    ),
  );
  const [lang] = useQueryState("lang", parseAsString.withDefault(""));
  const [topic] = useQueryState("topic", parseAsString.withDefault(""));
  const [hideShells] = useQueryState("hideShells", parseAsBoolean.withDefault(true));
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(
    async (nextCursor?: string) => {
      setLoading(true);
      setError(null);
      if (!nextCursor) {
        setItems([]);
      }

      const params = new URLSearchParams({ view, period });
      if (lang) params.set("lang", lang);
      if (topic) params.set("topic", topic);
      if (!hideShells) params.set("includeNoise", "true");
      if (nextCursor) params.set("cursor", nextCursor);

      try {
        const res = await fetch(`/api/feed?${params}`);
        const data = (await res.json()) as FeedResponse & { error?: string };

        if (!res.ok) {
          setError(data.error ?? "Failed to load feed");
          if (!nextCursor) setItems([]);
          return;
        }

        const pageItems = Array.isArray(data.items) ? data.items : [];
        setItems((prev) => (nextCursor ? [...prev, ...pageItems] : pageItems));
        setCursor(data.nextCursor ?? null);
        onUpdatedAt?.(data.updatedAt ?? null);
      } catch {
        setError("Failed to load feed");
        if (!nextCursor) setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [view, period, lang, topic, hideShells, onUpdatedAt],
  );

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  if (!loading && error) {
    return <p className="feed-error">{error}</p>;
  }

  if (!loading && items.length === 0) {
    return <p className="feed-empty">{t("feed")}</p>;
  }

  if (loading && items.length === 0) {
    return (
      <section className="feed-section" aria-live="polite">
        <FeedListSkeleton label={loadMoreT("loading")} />
      </section>
    );
  }

  return (
    <section className="feed-section" aria-live="polite">
      <ol className="rank-list">
        {items.map((item) => (
          <RankCard key={`${item.slug}-${item.rank}`} item={item} />
        ))}
      </ol>
      {cursor && (
        <div className="feed-load-more">
          <button
            type="button"
            onClick={() => loadFeed(cursor)}
            disabled={loading}
            className="btn-ghost"
            aria-busy={loading}
          >
            {loading ? loadMoreT("loadingMore") : loadMoreT("loadMore")}
          </button>
        </div>
      )}
    </section>
  );
}
