"use client";

import { FeedListSkeleton } from "@/components/feed/FeedListSkeleton";
import { RankCard } from "@/components/feed/RankCard";
import { Link, useRouter } from "@/i18n/navigation";
import {
  isKeywordQueryValid,
  sanitizeSearchQuery,
} from "@/lib/search-query";
import type { FeedItem, SearchResponse } from "@github-trending/core/types";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";
import { FormEvent, useCallback, useEffect, useState } from "react";

const LANGUAGES = [
  { value: "", labelKey: "allLanguages" as const },
  { value: "Python", label: "Python" },
  { value: "TypeScript", label: "TypeScript" },
  { value: "Rust", label: "Rust" },
  { value: "Go", label: "Go" },
  { value: "JavaScript", label: "JavaScript" },
];

export function SearchResults() {
  const t = useTranslations("search");
  const filterT = useTranslations("filter");
  const feedT = useTranslations("feed");
  const router = useRouter();

  const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));
  const [tag] = useQueryState("tag", parseAsString.withDefault(""));
  const [lang, setLang] = useQueryState("lang", parseAsString.withDefault(""));

  const [draftQ, setDraftQ] = useState(q);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setDraftQ(q);
  }, [q]);

  const hasValidQuery = useCallback(() => {
    const keyword = sanitizeSearchQuery(q);
    const topic = sanitizeSearchQuery(tag);
    if (topic) return true;
    return isKeywordQueryValid(keyword);
  }, [q, tag]);

  const loadSearch = useCallback(
    async (nextCursor?: string) => {
      const keyword = sanitizeSearchQuery(q);
      const topic = sanitizeSearchQuery(tag);

      if (!topic && !isKeywordQueryValid(keyword)) {
        setValidationError(t("queryTooShort"));
        setItems([]);
        setCursor(null);
        setLoading(false);
        return;
      }

      if (!topic && !keyword) {
        setValidationError(t("queryRequired"));
        setItems([]);
        setCursor(null);
        setLoading(false);
        return;
      }

      setValidationError(null);
      setLoading(true);
      setError(null);
      if (!nextCursor) {
        setItems([]);
      }

      const params = new URLSearchParams();
      if (keyword) params.set("q", keyword);
      if (topic) params.set("tag", topic);
      if (lang) params.set("lang", lang);
      if (nextCursor) params.set("cursor", nextCursor);

      try {
        const res = await fetch(`/api/search?${params}`);
        const data = (await res.json()) as SearchResponse & { error?: string };

        if (!res.ok) {
          setError(data.error ?? t("error"));
          if (!nextCursor) setItems([]);
          return;
        }

        const pageItems = Array.isArray(data.items) ? data.items : [];
        setItems((prev) => (nextCursor ? [...prev, ...pageItems] : pageItems));
        setCursor(data.nextCursor ?? null);
      } catch {
        setError(t("error"));
        if (!nextCursor) setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [q, tag, lang, t],
  );

  useEffect(() => {
    if (!hasValidQuery()) {
      setValidationError(
        sanitizeSearchQuery(tag)
          ? null
          : sanitizeSearchQuery(q)
            ? t("queryTooShort")
            : t("queryRequired"),
      );
      setItems([]);
      setCursor(null);
      setLoading(false);
      return;
    }
    void loadSearch();
  }, [hasValidQuery, loadSearch, q, tag, t]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = sanitizeSearchQuery(draftQ);
    if (!next) {
      router.push("/");
      return;
    }
    if (!isKeywordQueryValid(next) && !sanitizeSearchQuery(tag)) {
      setValidationError(t("queryTooShort"));
      return;
    }
    void setQ(next || null);
  }

  const showResults = hasValidQuery() && !validationError;

  return (
    <div className="search-panel">
      <form className="search-form" onSubmit={handleSearchSubmit}>
        <label className="visually-hidden" htmlFor="search-page-input">
          {t("placeholder")}
        </label>
        <input
          id="search-page-input"
          type="search"
          className="search-form__input"
          value={draftQ}
          onChange={(e) => setDraftQ(e.target.value)}
          placeholder={t("placeholder")}
          autoComplete="off"
        />
        <button type="submit" className="btn-ghost">
          {t("submit")}
        </button>
      </form>

      <div className="search-filters">
        <label className="visually-hidden" htmlFor="search-lang">
          {filterT("language")}
        </label>
        <select
          id="search-lang"
          className="filter-select"
          value={lang}
          onChange={(e) => void setLang(e.target.value || null)}
        >
          {LANGUAGES.map((item) => (
            <option key={item.value || "all"} value={item.value}>
              {"labelKey" in item ? filterT(item.labelKey) : item.label}
            </option>
          ))}
        </select>
        {tag && <span className="search-tag-pill">{t("tagFilter", { tag })}</span>}
      </div>

      {validationError && (
        <p className="search-message search-message--warn" role="alert">
          {validationError}
        </p>
      )}

      {error && (
        <p className="search-message search-message--error" role="alert">
          {error}
        </p>
      )}

      {showResults && loading && items.length === 0 && (
        <section className="feed-section" aria-live="polite">
          <FeedListSkeleton label={feedT("loading")} />
        </section>
      )}

      {showResults && !loading && items.length === 0 && !error && (
        <div className="search-empty">
          <p>{t("empty")}</p>
          <Link href="/" className="btn-ghost">
            {t("emptyCta")}
          </Link>
        </div>
      )}

      {showResults && items.length > 0 && (
        <section className="feed-section" aria-live="polite">
          <p className="search-result-meta">
            {t("resultCount", { n: items.length })}
          </p>
          <ol className="rank-list">
            {items.map((item) => (
              <RankCard key={`${item.slug}-${item.rank}`} item={item} />
            ))}
          </ol>
          {cursor && (
            <div className="feed-load-more">
              <button
                type="button"
                onClick={() => void loadSearch(cursor)}
                disabled={loading}
                className="btn-ghost"
                aria-busy={loading}
              >
                {loading ? feedT("loadingMore") : feedT("loadMore")}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
