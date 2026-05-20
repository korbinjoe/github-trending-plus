import type { RepoDetail } from "@github-trending/core/types";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatCompactNumber, formatRelativePush } from "@/lib/format";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { PhDetailPanel } from "@/components/ph/PhDetailPanel";

interface RepoDetailViewProps {
  detail: RepoDetail;
  locale: string;
}

function trustDotClass(health: RepoDetail["health"]): string {
  if (health === "fair") return "dot dot--warn";
  if (health === "low") return "dot dot--bad";
  return "dot";
}

function licenseLabel(license: string | null, t: Awaited<ReturnType<typeof getTranslations>>): string {
  if (!license) return t("repo.trust.licenseUnknown");
  return t("repo.trust.licenseVal", { license });
}

export async function RepoDetailView({ detail, locale }: RepoDetailViewProps) {
  const t = await getTranslations();
  const phT = await getTranslations("ph");

  const whyHot: string[] = [];
  if (detail.phSignal) {
    const phDate = detail.phSignal.featuredAt ?? detail.phSignal.postedAt;
    whyHot.push(
      phT("whyHot", {
        votes: detail.phSignal.votesCount,
        date: phDate.slice(0, 10),
      }),
    );
  }
  if (detail.deltaStars > 0) {
    whyHot.push(t("repo.whyHot.stars", { delta: detail.deltaStars }));
  }
  if (detail.isEarlySignal) {
    whyHot.push(t("repo.whyHot.early"));
  }

  const pushLabel = formatRelativePush(detail.lastPush, locale);
  const sustainVal = t("repo.trust.sustainVal", {
    commits: detail.commits30d,
    push: pushLabel,
  });

  const busKey =
    detail.health === "active"
      ? "repo.trust.busHealthy"
      : detail.health === "fair"
        ? "repo.trust.busFair"
        : "repo.trust.busLow";

  const readmeParagraphs = detail.description
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 2);

  return (
    <>
      <Link href="/" className="page-back">
        ← {t("repo.back")}
      </Link>

      <div className="repo-title-row">
        <h1 className="repo-title">
          {detail.owner} / {detail.name}
        </h1>
        <FavoriteButton
          owner={detail.owner}
          name={detail.name}
          variant="labeled"
          snapshot={{
            description: detail.description,
            deltaStars: detail.deltaStars,
            health: detail.health,
          }}
        />
      </div>

      <div className="summary-row">
        <p className="summary">{detail.description}</p>
        {detail.description && (
          <span className="badge-signal badge-signal--safe">{t("badge.verified")}</span>
        )}
      </div>
      <p className="panel-note">{t("repo.verifiedNote")}</p>

      {detail.phSignal && <PhDetailPanel signal={detail.phSignal} />}

      {whyHot.length > 0 && (
        <section className="panel panel--accent" aria-labelledby="why-hot-heading">
          <h2 className="panel__title" id="why-hot-heading">
            {t("repo.whyHot.title")}
          </h2>
          <ul className="why-hot-list">
            {whyHot.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="panel__title panel__title--section">{t("repo.trust.title")}</h2>
      <div className="trust-grid">
        <article className="trust-card">
          <h3>{t("repo.trust.license")}</h3>
          <p>{licenseLabel(detail.license, t)}</p>
          <a href={detail.urls.librariesIo} target="_blank" rel="noopener noreferrer">
            {t("repo.cta.license")}
          </a>
        </article>
        <article className="trust-card">
          <h3>{t("repo.trust.security")}</h3>
          <p>{t("repo.trust.securityVal")}</p>
          <a href={detail.urls.ossInsight} target="_blank" rel="noopener noreferrer">
            {t("repo.trust.securityLink")}
          </a>
        </article>
        <article className="trust-card">
          <h3>{t("repo.trust.sustain")}</h3>
          <p>{sustainVal}</p>
          <p className="trust-card__bus">
            <span className="health">
              <span className={trustDotClass(detail.health)} aria-hidden="true" />
              <span>{t(busKey)}</span>
            </span>
          </p>
        </article>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span className="stat__label">{t("repo.statDelta")}</span>
          <span className="stat__value stat__value--accent">+{detail.deltaStars} ★</span>
        </div>
        <div className="stat">
          <span className="stat__label">{t("repo.statTotal")}</span>
          <span className="stat__value">{formatCompactNumber(detail.totalStars)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">{t("repo.statCommits")}</span>
          <span className="stat__value">{detail.commits30d}</span>
        </div>
        <div className="stat">
          <span className="stat__label">{t("repo.statPush")}</span>
          <span className="stat__value stat__value--sm">{pushLabel}</span>
        </div>
      </div>

      <div className="tag-list tag-list--spaced">
        {detail.license && <span className="tag tag--license">{detail.license}</span>}
        {detail.language && <span className="tag">{detail.language}</span>}
        {detail.tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
        {detail.urls.bestOfJs && (
          <span className="tag tag--warn">{t("repo.tag.bestofjs")}</span>
        )}
      </div>

      <div className="cta-row">
        <a
          className="btn btn--primary"
          href={detail.urls.github}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("repo.cta.github")}
        </a>
        <a
          className="btn"
          href={detail.urls.starHistory}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("repo.cta.chart")}
        </a>
        <a
          className="btn"
          href={detail.urls.ossInsight}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("repo.cta.insight")}
        </a>
        <a
          className="btn"
          href={detail.urls.ossInsight}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("repo.cta.security")}
        </a>
        {detail.urls.bestOfJs && (
          <a
            className="btn"
            href={detail.urls.bestOfJs}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("repo.cta.bestofjs")}
          </a>
        )}
      </div>

      <section className="panel">
        <h2 className="panel__title">{t("repo.readme.title")}</h2>
        {readmeParagraphs.length > 0 ? (
          readmeParagraphs.map((para) => (
            <p key={para.slice(0, 40)}>{para}</p>
          ))
        ) : (
          <p>{detail.description || t("repo.readme.empty")}</p>
        )}
        <p>{t("repo.readme.note")}</p>
      </section>
    </>
  );
}
