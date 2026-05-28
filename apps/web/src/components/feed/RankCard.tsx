"use client";

import { ChartModal } from "@/components/chart/ChartModal";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { useRouter } from "@/i18n/navigation";
import type { FeedItem } from "@github-trending/core/types";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PhBadge } from "@/components/ph/PhBadge";
import { PhGithubLinkedBadge } from "@/components/ph/PhGithubLinkedBadge";
import { usePrefetchLaunchDetail } from "@/hooks/usePrefetchLaunchDetail";
import { HighlightedText } from "@/components/search/HighlightedText";
import { githubRepoUrl, repoUrl } from "@/lib/site";
import { buildRepoCardTweet } from "@/lib/share-text";
import { ShareToX } from "@/components/share/ShareToX";
import { AlternativesStrip } from "./AlternativesStrip";
import { HealthDot } from "./HealthDot";

const LICENSE_TAGS = new Set([
  "MIT",
  "Apache-2.0",
  "GPL-3.0",
  "BSD-3-Clause",
  "ISC",
]);

interface RankCardProps {
  item: FeedItem;
  /** When set (e.g. on search results), matches are highlighted in title and description. */
  highlightQuery?: string;
}

function signalBadgeClass(trigger: string): string {
  if (/hn/i.test(trigger)) return "badge-signal badge-signal--hn";
  if (/shell/i.test(trigger)) return "badge-signal badge-signal--shell";
  return "badge-signal badge-signal--trigger";
}

function ChartIcon() {
  return (
    <svg className="btn-icon__svg" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 19V5M10 19V9M16 19v-4M22 19V11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg className="btn-icon__svg" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  );
}

export function RankCard({ item, highlightQuery }: RankCardProps) {
  const t = useTranslations();
  const tabT = useTranslations("tab");
  const router = useRouter();
  const { launchDetailHref, prefetchLaunch } = usePrefetchLaunchDetail();
  const [chartOpen, setChartOpen] = useState(false);
  const repoHref = `/repo/${item.owner}/${item.name}`;
  const prefetchRepo = () => router.prefetch(repoHref);
  const healthLabel = t(`health.${item.health}`);
  const hasAltStrip = item.alternatives.length > 0;
  const isTopRank = item.rank <= 3;
  const hasChips =
    Boolean(item.phSignal) ||
    (item.triggers && item.triggers.length > 0) ||
    item.tags.length > 0;

  const repoLabel = `${item.owner}/${item.name}`;

  return (
    <li className={`rank-item${hasAltStrip ? " rank-item--alt" : ""}`}>
      <div className="rank-card">
        <div
          className="rank-card__cover"
          role="link"
          tabIndex={0}
          aria-label={repoLabel}
          onMouseEnter={prefetchRepo}
          onFocus={prefetchRepo}
          onClick={() => router.push(repoHref)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push(repoHref);
            }
          }}
        />
        <div className="rank-card__layout">
          <div className="rank-card__content">
            <div className="rank-card__top">
              <span
                className={`rank-card__rank${isTopRank ? " rank-card__rank--top" : ""}`}
              >
                {item.rank}
              </span>
              <div className="rank-card__title">
                {highlightQuery ? (
                  <>
                    <HighlightedText
                      text={item.owner}
                      query={highlightQuery}
                      className="owner"
                    />
                    <span className="repo">
                      /{" "}
                      <HighlightedText
                        text={item.name}
                        query={highlightQuery}
                      />
                    </span>
                  </>
                ) : (
                  <>
                    <span className="owner">{item.owner}</span>
                    <span className="repo">/ {item.name}</span>
                  </>
                )}
                {item.isEarlySignal && (
                  <span className="badge-early">{tabT("early")}</span>
                )}
              </div>
              <div className="rank-card__stats">
                <span
                  className="delta"
                  aria-label={`+${item.deltaStars.toLocaleString()}`}
                >
                  +{item.deltaStars.toLocaleString()}
                </span>
                <div className="rank-card__actions">
                  <ShareToX
                    text={buildRepoCardTweet(item.owner, item.name, item.description, item.deltaStars)}
                    url={repoUrl(item.owner, item.name)}
                  />
                  <FavoriteButton
                    owner={item.owner}
                    name={item.name}
                    snapshot={{
                      description: item.description,
                      deltaStars: item.deltaStars,
                      health: item.health,
                    }}
                  />
                  <button
                    type="button"
                    className="btn-icon github-trigger"
                    aria-label={t("cta.github")}
                    title={t("cta.github")}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(
                        githubRepoUrl(item.owner, item.name),
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    <GithubIcon />
                  </button>
                  <button
                    type="button"
                    className="btn-icon chart-trigger"
                    aria-label={t("cta.chart")}
                    title={t("cta.chart")}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setChartOpen(true);
                    }}
                  >
                    <ChartIcon />
                  </button>
                </div>
              </div>
            </div>

            {item.description && (
              <p className="rank-card__desc">
                {highlightQuery ? (
                  <HighlightedText
                    text={item.description}
                    query={highlightQuery}
                  />
                ) : (
                  item.description
                )}
              </p>
            )}

            <div className="rank-card__bottom">
              {hasChips && (
                <div className="rank-card__chips">
                  {item.phSignal && (
                    <PhBadge
                      signal={item.phSignal}
                      href={launchDetailHref(item.phSignal.slug)}
                      onWarm={() => prefetchLaunch(item.phSignal!.slug)}
                    />
                  )}
                  {item.phSignal?.githubUrl && (
                    <PhGithubLinkedBadge signal={item.phSignal} indexed />
                  )}
                  {item.triggers?.map((trigger) => (
                    <span key={trigger} className={signalBadgeClass(trigger)}>
                      {trigger}
                    </span>
                  ))}
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`tag${LICENSE_TAGS.has(tag) ? " tag--license" : ""}`}
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            )}

              <div className="rank-card__status">
                <HealthDot health={item.health} label={healthLabel} />
              </div>
            </div>
          </div>
        </div>
      </div>
      {hasAltStrip && (
        <AlternativesStrip
          alternatives={item.alternatives}
          compareUrl={item.compareUrl}
        />
      )}
      <ChartModal
        owner={item.owner}
        name={item.name}
        open={chartOpen}
        onClose={() => setChartOpen(false)}
      />
    </li>
  );
}
