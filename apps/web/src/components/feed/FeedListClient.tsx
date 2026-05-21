"use client";

import { FeedListSkeleton } from "@/components/feed/FeedListSkeleton";
import { useFeedLoading } from "@/components/feed/FeedLoadingContext";
import { FeedLoadingOverlay } from "@/components/feed/FeedLoadingOverlay";
import { PhFeedEmpty } from "@/components/feed/PhFeedEmpty";
import { PhLaunchCard } from "@/components/feed/PhLaunchCard";
import { PhProductCard } from "@/components/feed/PhProductCard";
import { RankCard } from "@/components/feed/RankCard";
import { buildFeedApiSearchParams } from "@/lib/feed-api-params";
import type { ParsedFeedParams } from "@/lib/feed-params";
import {
  feedHideShellsParser,
  feedLangParser,
  feedPeriodParser,
  feedPhGithubParser,
  feedTopicParser,
  feedViewParser,
} from "@/lib/feed-query-nuqs";
import type {
  FeedItem,
  FeedResponse,
  PhFeedEntry,
  PhFeedResponse,
} from "@github-trending/core/types";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface FeedListClientProps {
  initialFeed?: FeedResponse;
  initialPhFeed?: PhFeedResponse;
}

function feedParamsKey(
  params: Pick<
    ParsedFeedParams,
    "view" | "period" | "lang" | "topic" | "includeNoise" | "phGithub"
  >,
): string {
  return [
    params.view,
    params.period,
    params.lang ?? "",
    params.topic ?? "",
    String(params.includeNoise),
    params.phGithub,
  ].join("|");
}

function phEntryKey(entry: PhFeedEntry): string {
  if (entry.kind === "repo") {
    return `repo-${entry.item.slug}-${entry.item.rank}`;
  }
  if (entry.kind === "launch") {
    return `launch-${entry.item.slug}-${entry.item.rank}`;
  }
  return `product-${entry.item.phSignal.slug}-${entry.item.rank}`;
}

export function FeedListClient({
  initialFeed,
  initialPhFeed,
}: FeedListClientProps) {
  const emptyT = useTranslations("empty");
  const feedT = useTranslations("feed");
  const { setIsLoading: setGlobalFeedLoading } = useFeedLoading();

  const [view] = useQueryState("view", feedViewParser);
  const [period] = useQueryState("period", feedPeriodParser);
  const [lang] = useQueryState("lang", feedLangParser);
  const [topic] = useQueryState("topic", feedTopicParser);
  const [hideShells] = useQueryState("hideShells", feedHideShellsParser);
  const [phGithub] = useQueryState("phGithub", feedPhGithubParser);

  const isPhView = view === "ph";

  const feedParams = useMemo(
    (): Pick<
      ParsedFeedParams,
      "view" | "period" | "lang" | "topic" | "includeNoise" | "phGithub"
    > => ({
      view,
      period,
      lang: lang || undefined,
      topic: topic || undefined,
      includeNoise: !hideShells,
      phGithub,
    }),
    [view, period, lang, topic, hideShells, phGithub],
  );

  const feedParamsRef = useRef(feedParams);
  feedParamsRef.current = feedParams;

  const paramsKey = feedParamsKey(feedParams);
  const skipFilterFetchRef = useRef(true);
  const fetchGenRef = useRef(0);
  const githubCacheRef = useRef(new Map<string, FeedResponse>());
  const phCacheRef = useRef(new Map<string, PhFeedResponse>());
  const sectionRef = useRef<HTMLElement>(null);

  const [githubItems, setGithubItems] = useState<FeedItem[]>(
    initialFeed?.items ?? [],
  );
  const [phItems, setPhItems] = useState<PhFeedEntry[]>(
    initialPhFeed?.items ?? [],
  );
  const [cursor, setCursor] = useState<string | null>(
    isPhView
      ? (initialPhFeed?.nextCursor ?? null)
      : (initialFeed?.nextCursor ?? null),
  );
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [overlayMinHeight, setOverlayMinHeight] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPhView && initialPhFeed) {
      phCacheRef.current.set(paramsKey, initialPhFeed);
    } else if (!isPhView && initialFeed) {
      githubCacheRef.current.set(paramsKey, initialFeed);
    }
  }, [paramsKey, initialFeed, initialPhFeed, isPhView]);

  const loadFeed = useCallback(
    async (nextCursor?: string, options?: { fromFilter?: boolean }) => {
      const isPagination = Boolean(nextCursor);
      const key = feedParamsKey(feedParamsRef.current);
      const generation = ++fetchGenRef.current;
      const ph = feedParamsRef.current.view === "ph";

      setError(null);
      setGlobalFeedLoading(true);

      if (!isPagination) {
        if (options?.fromFilter) {
          const phCache = ph ? phCacheRef.current.get(key) : undefined;
          const ghCache = ph ? undefined : githubCacheRef.current.get(key);
          if (ph && phCache) {
            setPhItems(phCache.items ?? []);
            setCursor(phCache.nextCursor ?? null);
            setFilterLoading(false);
            setGlobalFeedLoading(false);
            return;
          }
          if (!ph && ghCache) {
            setGithubItems(ghCache.items ?? []);
            setCursor(ghCache.nextCursor ?? null);
            setFilterLoading(false);
            setGlobalFeedLoading(false);
            return;
          }
          const h = sectionRef.current?.offsetHeight;
          if (h && h > 120) setOverlayMinHeight(h);
          setFilterLoading(true);
          if (ph) setPhItems([]);
          else setGithubItems([]);
        } else {
          setFilterLoading(false);
          setLoading(true);
          if (ph) setPhItems([]);
          else setGithubItems([]);
        }
      } else {
        setFilterLoading(false);
        setLoading(true);
      }

      const params = buildFeedApiSearchParams(feedParamsRef.current, nextCursor);
      try {
        const res = await fetch(`/api/feed?${params}`);
        if (ph) {
          const data = (await res.json()) as PhFeedResponse & { error?: string };
          if (generation !== fetchGenRef.current) return;

          if (!res.ok) {
            setError(data.error ?? feedT("error"));
            if (!isPagination) setPhItems([]);
            setCursor(null);
            return;
          }

          const pageItems = Array.isArray(data.items) ? data.items : [];
          if (!isPagination) {
            setPhItems(pageItems);
            setCursor(data.nextCursor ?? null);
            phCacheRef.current.set(key, {
              items: pageItems,
              nextCursor: data.nextCursor ?? null,
              updatedAt: data.updatedAt ?? null,
            });
          } else {
            setPhItems((prev) => [...prev, ...pageItems]);
            setCursor(data.nextCursor ?? null);
          }
        } else {
          const data = (await res.json()) as FeedResponse & { error?: string };
          if (generation !== fetchGenRef.current) return;

          if (!res.ok) {
            setError(data.error ?? feedT("error"));
            if (!isPagination) setGithubItems([]);
            setCursor(null);
            return;
          }

          const pageItems = Array.isArray(data.items) ? data.items : [];
          if (!isPagination) {
            setGithubItems(pageItems);
            setCursor(data.nextCursor ?? null);
            githubCacheRef.current.set(key, {
              items: pageItems,
              nextCursor: data.nextCursor ?? null,
              rankingRunId: data.rankingRunId ?? null,
              updatedAt: data.updatedAt ?? null,
            });
          } else {
            setGithubItems((prev) => [...prev, ...pageItems]);
            setCursor(data.nextCursor ?? null);
          }
        }
      } catch {
        if (generation !== fetchGenRef.current) return;
        setError(feedT("error"));
        if (!isPagination) {
          if (ph) setPhItems([]);
          else setGithubItems([]);
        }
        setCursor(null);
      } finally {
        if (generation === fetchGenRef.current) {
          setLoading(false);
          setFilterLoading(false);
          setOverlayMinHeight(undefined);
          setGlobalFeedLoading(false);
        }
      }
    },
    [feedT, setGlobalFeedLoading],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("cursor")) return;
    url.searchParams.delete("cursor");
    const next =
      url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "");
    window.history.replaceState(null, "", next);
  }, []);

  useEffect(() => {
    if (skipFilterFetchRef.current) {
      skipFilterFetchRef.current = false;
      return;
    }
    void loadFeed(undefined, { fromFilter: true });
  }, [paramsKey, loadFeed]);

  const itemCount = isPhView ? phItems.length : githubItems.length;

  if (error && itemCount === 0 && !filterLoading) {
    return (
      <p className="feed-empty" role="alert">
        {error}
      </p>
    );
  }

  if (!loading && !filterLoading && itemCount === 0) {
    if (isPhView) {
      return <PhFeedEmpty linkedOnly={phGithub === "linked"} />;
    }
    return <p className="feed-empty">{emptyT("feed")}</p>;
  }

  return (
    <section ref={sectionRef} className="feed-section" aria-live="polite">
      {filterLoading && (
        <FeedLoadingOverlay minHeight={overlayMinHeight} />
      )}
      {!filterLoading && loading && itemCount === 0 && (
        <FeedListSkeleton label={feedT("loading")} />
      )}
      {!filterLoading && itemCount > 0 && (
        <ol className="rank-list">
          {isPhView
            ? phItems.map((entry) => {
                if (entry.kind === "repo") {
                  return (
                    <RankCard
                      key={phEntryKey(entry)}
                      item={entry.item}
                    />
                  );
                }
                if (entry.kind === "launch") {
                  return (
                    <PhLaunchCard
                      key={phEntryKey(entry)}
                      item={entry.item}
                    />
                  );
                }
                return (
                  <PhProductCard
                    key={phEntryKey(entry)}
                    item={entry.item}
                  />
                );
              })
            : githubItems.map((item) => (
                <RankCard key={`${item.slug}-${item.rank}`} item={item} />
              ))}
        </ol>
      )}
      {error && itemCount > 0 && !filterLoading && (
        <p className="feed-empty" role="alert">
          {error}
        </p>
      )}
      {cursor && !filterLoading && (
        <div className="feed-load-more">
          <button
            type="button"
            onClick={() => void loadFeed(cursor)}
            disabled={loading}
            className="btn-ghost"
            aria-busy={loading}
          >
            {loading ? feedT("loadingMore") : feedT("loadMore")}
          </button>
        </div>
      )}
    </section>
  );
}
