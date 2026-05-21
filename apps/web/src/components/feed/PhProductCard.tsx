"use client";

import { PhBadge } from "@/components/ph/PhBadge";
import type { PhProductItem } from "@github-trending/core/types";
import { useTranslations } from "next-intl";

interface PhProductCardProps {
  item: PhProductItem;
}

export function PhProductCard({ item }: PhProductCardProps) {
  const phT = useTranslations("ph");
  const launchT = useTranslations("launch");
  const isTopRank = item.rank <= 3;

  return (
    <li className="rank-item">
      <article className="rank-card ph-product-card">
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
                  {launchT("productOnly")}
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
            {item.website && (
              <a
                className="btn btn--sm btn--ghost"
                href={item.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                {launchT("website")} ↗
              </a>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}
