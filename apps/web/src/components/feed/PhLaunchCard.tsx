"use client";

import { PhBadge } from "@/components/ph/PhBadge";
import { githubRepoUrl } from "@/lib/site";
import type { PhLaunchItem } from "@github-trending/core/types";
import { useTranslations } from "next-intl";

interface PhLaunchCardProps {
  item: PhLaunchItem;
}

export function PhLaunchCard({ item }: PhLaunchCardProps) {
  const t = useTranslations("launch");
  const phT = useTranslations("ph");
  const isTopRank = item.rank <= 3;
  const githubUrl = githubRepoUrl(item.githubOwner, item.githubName);

  return (
    <li className="rank-item">
      <article className="rank-card ph-launch-card">
        <div className="rank-card__layout">
          <div className="rank-card__content">
            <div className="rank-card__top">
              <span
                className={`rank-card__rank${isTopRank ? " rank-card__rank--top" : ""}`}
              >
                {item.rank}
              </span>
              <div className="rank-card__title">
                <span className="owner">{item.name}</span>
              </div>
              <div className="rank-card__stats">
                <span className="delta">PH {item.votesCount}↑</span>
              </div>
            </div>
            {item.tagline && (
              <p className="rank-card__desc">{item.tagline}</p>
            )}
            <div className="rank-card__bottom">
              <div className="rank-card__chips">
                <PhBadge signal={item.phSignal} />
                <span className="badge-signal badge-signal--muted">
                  {t("notIndexed")}
                </span>
              </div>
            </div>
          </div>
          <div className="rank-card__actions">
            <a
              className="btn btn--sm"
              href={item.phSignal.phUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {phT("cta")}
            </a>
            <a
              className="btn btn--sm btn--ghost"
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </article>
    </li>
  );
}
