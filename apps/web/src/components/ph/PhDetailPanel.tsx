import type { PhSignal } from "@github-trending/core/types";
import { getLocale, getTranslations } from "next-intl/server";

interface PhDetailPanelProps {
  signal: PhSignal;
}

function formatFullDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export async function PhDetailPanel({ signal }: PhDetailPanelProps) {
  const t = await getTranslations("ph");
  const locale = await getLocale();

  return (
    <section className="panel panel--ph" aria-labelledby="ph-panel-heading">
      <div className="ph-panel__head">
        <h2 className="ph-panel__title" id="ph-panel-heading">
          <span className="ph-mark" aria-hidden="true">
            P
          </span>
          {t("panelTitle")}
        </h2>
        <a
          className="btn btn--primary"
          href={signal.phUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("cta")} ↗
        </a>
      </div>
      {signal.tagline && <p className="ph-panel__tagline">{signal.tagline}</p>}
      <div className="ph-panel__stats">
        <span>
          {t("votes")} <strong>{signal.votesCount.toLocaleString(locale)}</strong>
        </span>
        {signal.featuredAt && (
          <span>
            {t("featured")}{" "}
            <strong>{formatFullDate(signal.featuredAt, locale)}</strong>
          </span>
        )}
        <span>
          {t("posted")}{" "}
          <strong>{formatFullDate(signal.postedAt, locale)}</strong>
        </span>
      </div>
      <p className="ph-attribution">{t("panelAttribution")}</p>
    </section>
  );
}
