"use client";

import type { PhSignal } from "@github-trending/core/types";
import { useLocale, useTranslations } from "next-intl";

function formatPhDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

interface PhBadgeProps {
  signal: PhSignal;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
}

export function PhBadge({ signal, className = "", onClick }: PhBadgeProps) {
  const t = useTranslations("ph");
  const locale = useLocale();
  const dateIso = signal.featuredAt ?? signal.postedAt;
  const dateLabel = formatPhDate(dateIso, locale);
  const label = signal.featuredAt
    ? t("badgeFeatured", { votes: signal.votesCount.toLocaleString(locale), date: dateLabel })
    : t("badgeLaunch", { votes: signal.votesCount.toLocaleString(locale), date: dateLabel });

  return (
    <a
      href={signal.phUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`badge-signal badge-signal--ph ${className}`.trim()}
      onClick={onClick}
    >
      {label}
    </a>
  );
}
