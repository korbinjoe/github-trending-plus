import { Link } from "@/i18n/navigation";
import type { FeedItem } from "@github-trending/core/types";
import { getTranslations } from "next-intl/server";
import { AlternativesStripServer } from "./AlternativesStripServer";
import { HealthDot } from "./HealthDot";
import { PhBadge } from "@/components/ph/PhBadge";
import { RankCardActions } from "./RankCardActions";

const LICENSE_TAGS = new Set([
  "MIT",
  "Apache-2.0",
  "GPL-3.0",
  "BSD-3-Clause",
  "ISC",
]);

function signalBadgeClass(trigger: string): string {
  if (/hn/i.test(trigger)) return "badge-signal badge-signal--hn";
  if (/shell/i.test(trigger)) return "badge-signal badge-signal--shell";
  return "badge-signal badge-signal--trigger";
}

interface RankCardServerProps {
  item: FeedItem;
}

export async function RankCardServer({ item }: RankCardServerProps) {
  const t = await getTranslations();
  const tabT = await getTranslations("tab");
  const healthLabel = t(`health.${item.health}`);
  const hasAltStrip = item.alternatives.length > 0;
  const isTopRank = item.rank <= 3;
  const hasChips =
    Boolean(item.phSignal) ||
    (item.triggers && item.triggers.length > 0) ||
    item.tags.length > 0;

  return (
    <li className={`rank-item${hasAltStrip ? " rank-item--alt" : ""}`}>
      <Link
        href={`/repo/${item.owner}/${item.name}`}
        prefetch
        className="rank-card"
      >
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
                <RankCardActions item={item} />
              </div>
            </div>

            {item.description && (
              <p className="rank-card__desc">{item.description}</p>
            )}

            <div className="rank-card__bottom">
              {hasChips && (
                <div className="rank-card__chips">
                  {item.phSignal && <PhBadge signal={item.phSignal} />}
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
        <AlternativesStripServer
          alternatives={item.alternatives}
          compareUrl={item.compareUrl}
        />
      )}
    </li>
  );
}
