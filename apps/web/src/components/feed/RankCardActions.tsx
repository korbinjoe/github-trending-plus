"use client";

import { ChartModal } from "@/components/chart/ChartModal";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import type { FeedItem } from "@github-trending/core/types";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { githubRepoUrl } from "@/lib/site";

interface RankCardActionsProps {
  item: FeedItem;
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

export function RankCardActions({ item }: RankCardActionsProps) {
  const t = useTranslations();
  const [chartOpen, setChartOpen] = useState(false);

  return (
    <>
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
      <ChartModal
        owner={item.owner}
        name={item.name}
        open={chartOpen}
        onClose={() => setChartOpen(false)}
      />
    </>
  );
}
