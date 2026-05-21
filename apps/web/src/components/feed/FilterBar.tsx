"use client";

import { useFeedLoading } from "@/components/feed/FeedLoadingContext";
import { useTranslations } from "next-intl";
import { TopicFilterChips } from "@/components/feed/TopicFilterChips";
import {
  feedHideShellsParser,
  feedLangParser,
  feedPeriodParser,
  feedPhGithubParser,
  feedViewParser,
} from "@/lib/feed-query-nuqs";
import { useQueryState } from "nuqs";

const PERIODS = ["today", "week", "month", "halfYear", "year"] as const;
const VIEWS = ["velocity", "early", "ph"] as const;
const PH_GITHUB_FILTERS = ["all", "linked"] as const;
const LANGUAGES = [
  { value: "", labelKey: "allLanguages" as const },
  { value: "Python", label: "Python" },
  { value: "TypeScript", label: "TypeScript" },
  { value: "Rust", label: "Rust" },
  { value: "Go", label: "Go" },
  { value: "JavaScript", label: "JavaScript" },
];

interface FilterBarProps {
  topicFilters: string[];
}

export function FilterBar({ topicFilters }: FilterBarProps) {
  const t = useTranslations("filter");
  const tabT = useTranslations("tab");
  const legendT = useTranslations("legend");
  const badgeT = useTranslations("badge");
  const phFilterT = useTranslations("phFilter");
  const { isLoading: feedLoading } = useFeedLoading();

  const [view, setView] = useQueryState("view", feedViewParser);
  const [period, setPeriod] = useQueryState("period", feedPeriodParser);
  const [lang, setLang] = useQueryState("lang", feedLangParser);
  const [hideShells, setHideShells] = useQueryState(
    "hideShells",
    feedHideShellsParser,
  );
  const [phGithub, setPhGithub] = useQueryState("phGithub", feedPhGithubParser);

  const isPhView = view === "ph";

  const tabLabel = (v: (typeof VIEWS)[number]): string => {
    if (v === "velocity") return tabT("velocity");
    if (v === "early") return tabT("early");
    return tabT("ph");
  };

  const tabHint =
    view === "velocity"
      ? tabT("hintVelocity")
      : view === "early"
        ? tabT("hintEarly")
        : tabT("hintPh");

  return (
    <>
      <section className={`filters${feedLoading ? " filters--loading" : ""}`}>
        <div className="filters-row">
          <label className="visually-hidden" htmlFor="lang-select">
            {t("language")}
          </label>
          <select
            id="lang-select"
            className="filter-select"
            aria-label={t("language")}
            value={lang}
            onChange={(e) => setLang(e.target.value || null)}
          >
            {LANGUAGES.map((item) => (
              <option key={item.value || "all"} value={item.value}>
                {"labelKey" in item ? t(item.labelKey) : item.label}
              </option>
            ))}
          </select>

          <div className="seg seg--period" role="group" aria-label={t("period")}>
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                className={period === p ? "is-active" : ""}
                onClick={() => setPeriod(p)}
              >
                {t(p === "halfYear" ? "halfYear" : p)}
              </button>
            ))}
          </div>

          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={hideShells}
              onChange={(e) => setHideShells(e.target.checked)}
            />
            <span>{t("hideShells")}</span>
          </label>
        </div>

        {isPhView && (
          <div
            className="seg seg--ph-github"
            role="group"
            aria-label={phFilterT("label")}
          >
            {PH_GITHUB_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={phGithub === f ? "is-active" : ""}
                onClick={() => setPhGithub(f)}
              >
                {f === "all" ? phFilterT("all") : phFilterT("linked")}
              </button>
            ))}
          </div>
        )}

        <TopicFilterChips topicFilters={topicFilters} />
      </section>

      <div
        className={`tabs${feedLoading ? " tabs--loading" : ""}`}
        role="tablist"
        aria-busy={feedLoading}
      >
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            className={view === v ? "is-active" : ""}
            disabled={feedLoading}
            onClick={() => setView(v)}
          >
            {tabLabel(v)}
          </button>
        ))}
      </div>

      <p className="tab-hint">{tabHint}</p>

      {!isPhView && (
        <div className="signal-legend" aria-label={legendT("title")}>
          <span>
            <strong>{legendT("title")}</strong>
          </span>
          <span className="signal-legend__item">
            <span className="badge-signal badge-signal--trigger">release</span>
            <span>{legendT("trigger")}</span>
          </span>
          <span className="signal-legend__item">
            <span className="tag tag--license">MIT</span>
            <span>{legendT("license")}</span>
          </span>
          <span className="signal-legend__item">
            <span className="dot" aria-hidden="true" />
            <span>{legendT("health")}</span>
          </span>
          <span className="signal-legend__item">
            <span className="badge-signal badge-signal--shell">{badgeT("shell")}</span>
            <span>{legendT("shell")}</span>
          </span>
        </div>
      )}

      {isPhView && (
        <p className="ph-feed-attribution">{tabT("phAttribution")}</p>
      )}
    </>
  );
}
