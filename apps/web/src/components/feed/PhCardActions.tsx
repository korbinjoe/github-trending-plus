"use client";

import { ChartModal } from "@/components/chart/ChartModal";
import { PhFavoriteButton } from "@/components/favorites/PhFavoriteButton";
import { PhIndexedFavoriteButton } from "@/components/favorites/PhIndexedFavoriteButton";
import type { FeedItem, PhSignal } from "@github-trending/core/types";
import {
  isPhTrackingUrl,
  phOutboundLinks,
} from "@github-trending/core/ph-signal-utils";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { githubRepoUrl, launchUrl } from "@/lib/site";
import { ShareToX } from "@/components/share/ShareToX";
import { buildPhCardTweet } from "@/lib/share-text";

interface PhCardActionsProps {
  signal: PhSignal;
  productName: string;
  indexedRepo?: FeedItem;
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

function ExternalLinkIcon() {
  return (
    <svg className="btn-icon__svg" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"
      />
    </svg>
  );
}

/** Icon toolbar: PH favorites/outbound; optional indexed repo favorites/chart/github. */
export function PhCardActions({
  signal,
  productName,
  indexedRepo,
}: PhCardActionsProps) {
  const t = useTranslations();
  const phT = useTranslations("ph");
  const launchT = useTranslations("launch");
  const { github, website } = phOutboundLinks(signal);
  const [chartOpen, setChartOpen] = useState(false);

  const websiteLabel = website
    ? isPhTrackingUrl(website)
      ? launchT("websitePhLink")
      : launchT("website")
    : null;

  return (
    <>
      <div className="rank-card__actions">
        <ShareToX
          text={buildPhCardTweet(productName, signal.tagline, signal.votesCount)}
          url={launchUrl(signal.slug)}
        />
        {indexedRepo ? (
          <PhIndexedFavoriteButton
            slug={signal.slug}
            productName={productName}
            phSnapshot={{
              productName,
              tagline: signal.tagline,
              votesCount: signal.votesCount,
            }}
            owner={indexedRepo.owner}
            name={indexedRepo.name}
            repoSnapshot={{
              description: indexedRepo.description,
              deltaStars: indexedRepo.deltaStars,
              health: indexedRepo.health,
            }}
          />
        ) : (
          <PhFavoriteButton
            slug={signal.slug}
            productName={productName}
            snapshot={{
              productName,
              tagline: signal.tagline,
              votesCount: signal.votesCount,
            }}
          />
        )}
        <a
          className="btn-icon btn-icon--ph"
          href={signal.phUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={phT("cta")}
          aria-label={phT("cta")}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="btn-icon__ph-mark" aria-hidden="true">
            PH
          </span>
        </a>
        {(indexedRepo || github) && (
          <a
            className="btn-icon github-trigger"
            href={
              indexedRepo
                ? githubRepoUrl(indexedRepo.owner, indexedRepo.name)
                : github!
            }
            target="_blank"
            rel="noopener noreferrer"
            title={t("cta.github")}
            aria-label={t("cta.github")}
            onClick={(e) => e.stopPropagation()}
          >
            <GithubIcon />
          </a>
        )}
        {indexedRepo && (
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
        )}
        {!indexedRepo && website && websiteLabel && (
          <a
            className="btn-icon"
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            title={websiteLabel}
            aria-label={websiteLabel}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLinkIcon />
          </a>
        )}
      </div>
      {indexedRepo && (
        <ChartModal
          owner={indexedRepo.owner}
          name={indexedRepo.name}
          open={chartOpen}
          onClose={() => setChartOpen(false)}
        />
      )}
    </>
  );
}
