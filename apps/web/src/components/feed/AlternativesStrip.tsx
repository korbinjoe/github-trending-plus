import { Link } from "@/i18n/navigation";
import type { FeedItem } from "@github-trending/core/types";
import { useTranslations } from "next-intl";

interface AlternativesStripProps {
  alternatives: FeedItem["alternatives"];
  compareUrl?: string;
}

export function AlternativesStrip({
  alternatives,
  compareUrl,
}: AlternativesStripProps) {
  const t = useTranslations("alt");

  if (alternatives.length === 0) return null;

  const comparePath = compareUrl?.replace(/^https?:\/\/[^/]+/, "") ?? "";

  return (
    <div className="alt-strip">
      <span className="alt-strip__label">{t("consider")}</span>
      <span className="alt-strip__links">
        {alternatives.map((alt, index) => (
          <span key={alt.slug}>
            {index > 0 && <span className="alt-strip__sep">·</span>}
            <Link
              href={`/repo/${alt.owner}/${alt.name}`}
              className="alt-strip__link"
              onClick={(e) => e.stopPropagation()}
            >
              {alt.owner} / {alt.name}
            </Link>
          </span>
        ))}
      </span>
      {comparePath && (
        <Link
          href={comparePath}
          className="alt-strip__compare btn-ghost"
          onClick={(e) => e.stopPropagation()}
        >
          {t("compare")}
        </Link>
      )}
    </div>
  );
}
