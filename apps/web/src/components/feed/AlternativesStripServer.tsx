import { Link } from "@/i18n/navigation";
import type { FeedItem } from "@github-trending/core/types";

interface AlternativesStripServerProps {
  alternatives: FeedItem["alternatives"];
  compareUrl?: string;
  considerLabel: string;
  compareLabel: string;
}

export function AlternativesStripServer({
  alternatives,
  compareUrl,
  considerLabel,
  compareLabel,
}: AlternativesStripServerProps) {
  if (alternatives.length === 0) return null;

  const comparePath = compareUrl?.replace(/^https?:\/\/[^/]+/, "") ?? "";

  return (
    <div className="alt-strip">
      <span className="alt-strip__label">{considerLabel}</span>
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
          {compareLabel}
        </Link>
      )}
    </div>
  );
}
