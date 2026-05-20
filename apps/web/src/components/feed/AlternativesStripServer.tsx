import { Link } from "@/i18n/navigation";
import type { FeedItem } from "@github-trending/core/types";
import { getTranslations } from "next-intl/server";

interface AlternativesStripServerProps {
  alternatives: FeedItem["alternatives"];
  compareUrl?: string;
}

export async function AlternativesStripServer({
  alternatives,
  compareUrl,
}: AlternativesStripServerProps) {
  const t = await getTranslations("alt");

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
            >
              {alt.owner} / {alt.name}
            </Link>
          </span>
        ))}
      </span>
      {comparePath && (
        <Link href={comparePath} className="alt-strip__compare btn-ghost">
          {t("compare")}
        </Link>
      )}
    </div>
  );
}
