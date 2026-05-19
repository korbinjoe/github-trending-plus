"use client";

import { ChartModal } from "@/components/chart/ChartModal";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { Link } from "@/i18n/navigation";
import type { FeedItem } from "@github-trending/core/types";
import { useTranslations } from "next-intl";
import { useState } from "react";
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

export function RankCard({ item }: RankCardProps) {
  const t = useTranslations();
  const tabT = useTranslations("tab");
  const [chartOpen, setChartOpen] = useState(false);
  const healthLabel = t(`health.${item.health}`);
  const hasAltStrip = item.alternatives.length > 0;
  const isTopRank = item.rank <= 3;
  const hasChips =
    (item.triggers && item.triggers.length > 0) || item.tags.length > 0;

  return (
    <li className={`rank-item${hasAltStrip ? " rank-item--alt" : ""}`}>
      <Link href={`/repo/${item.owner}/${item.name}`} className="rank-card">
        <div className="rank-card__layout">
          <div className="rank-card__content">
            <div className="rank-card__top">
              <span
                className={`rank-card__rank${isTopRank ? " rank-card__rank--top" : ""}`}
              >
                {item.rank}
              </span>
              <div className="rank-card__title">
                <span className="owner">{item.owner}</span>
                <span className="repo">/ {item.name}</span>
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
              <p className="rank-card__desc">{item.description}</p>
            )}

            <div className="rank-card__bottom">
              {hasChips && (
                <div className="rank-card__chips">
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
      </Link>
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
