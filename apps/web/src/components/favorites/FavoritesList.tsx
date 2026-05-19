"use client";

import type {
  FavoriteHydrateResult,
  FavoriteItem,
} from "@github-trending/core/types";
import { Link } from "@/i18n/navigation";
import { useFavorites } from "@/hooks/useFavorites";
import { hydrateFavoritesClient } from "@/lib/favorites-hydrate";
import { githubRepoUrl } from "@/lib/site";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { HealthDot } from "@/components/feed/HealthDot";
import { FavoriteButton } from "./FavoriteButton";

function formatSavedAt(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function hydrateKey(owner: string, name: string): string {
  return `${owner}/${name}`.toLowerCase();
}

interface RowDisplay {
  item: FavoriteItem;
  hydrate?: FavoriteHydrateResult;
}

export function FavoritesList({ locale }: { locale: string }) {
  const t = useTranslations("favorites");
  const healthT = useTranslations("health");
  const { items, hydrated, remove, clearAll, count } = useFavorites();
  const [hydrateMap, setHydrateMap] = useState<Map<string, FavoriteHydrateResult>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [hydrateWarning, setHydrateWarning] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!hydrated || items.length === 0) {
      setHydrateMap(new Map());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setHydrateWarning(false);

    hydrateFavoritesClient(
      items.map((item) => ({ owner: item.owner, name: item.name })),
    )
      .then((results) => {
        if (cancelled) return;
        const map = new Map<string, FavoriteHydrateResult>();
        for (const row of results) {
          map.set(hydrateKey(row.owner, row.name), row);
        }
        setHydrateMap(map);
      })
      .catch(() => {
        if (!cancelled) setHydrateWarning(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [items, hydrated]);

  const rows: RowDisplay[] = useMemo(
    () => items.map((item) => ({
      item,
      hydrate: hydrateMap.get(hydrateKey(item.owner, item.name)),
    })),
    [items, hydrateMap],
  );

  if (!hydrated) {
    return <p className="favorites-loading">{t("loading")}</p>;
  }

  if (count === 0) {
    return (
      <div className="favorites-empty-wrap">
        <div className="favorites-empty" role="status">
          <svg
            className="favorites-empty__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <h2 className="favorites-empty__title">{t("emptyTitle")}</h2>
          <p className="favorites-empty__body">{t("emptyBody")}</p>
          <Link href="/" className="btn btn--primary favorites-empty__cta">
            {t("emptyCta")}
          </Link>
        </div>
        <p className="favorites-privacy favorites-privacy--empty">
          {t("privacyNote")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="favorites-toolbar">
        <p className="favorites-count">
          {t("count", { n: count })}
        </p>
        <div className="favorites-actions-bar">
          {!confirmClear ? (
            <button
              type="button"
              className="btn-text-danger"
              onClick={() => setConfirmClear(true)}
            >
              {t("clearAll")}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-text-danger"
                onClick={() => {
                  clearAll();
                  setConfirmClear(false);
                }}
              >
                {t("confirmClear")}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setConfirmClear(false)}
              >
                {t("cancelClear")}
              </button>
            </>
          )}
        </div>
      </div>

      {hydrateWarning && (
        <p className="favorites-warning" role="status">
          {t("hydrateWarning")}
        </p>
      )}

      <ul className="favorites-list" aria-label={t("listLabel")}>
        {loading &&
          Array.from({ length: Math.min(3, count) }).map((_, i) => (
            <li key={`sk-${i}`}>
              <article className="fav-item fav-item--skeleton">
                <div className="fav-item__main">
                  <p className="fav-item__title">&nbsp;</p>
                  <p className="fav-item__desc">&nbsp;</p>
                  <p className="fav-item__meta">&nbsp;</p>
                </div>
              </article>
            </li>
          ))}

        {!loading &&
          rows.map(({ item, hydrate }) => {
            const found = hydrate?.found === true;
            const desc =
              (found ? hydrate?.description : item.snapshot?.description) ?? "";
            const delta =
              (found ? hydrate?.deltaStars : item.snapshot?.deltaStars) ?? null;
            const health =
              (found ? hydrate?.health : item.snapshot?.health) ?? null;
            const tags = found ? hydrate?.tags : undefined;
            const notIndexed = hydrate && !hydrate.found;

            return (
              <li key={`${item.owner}/${item.name}`}>
                <article
                  className={`fav-item${notIndexed ? " fav-item--not-indexed" : ""}`}
                >
                  <div className="fav-item__main">
                    <div className="fav-item__title">
                      <Link href={`/repo/${item.owner}/${item.name}`}>
                        <span className="owner">{item.owner}</span>
                        <span className="repo">/ {item.name}</span>
                      </Link>
                      <span className="fav-item__saved">
                        {t("savedAt", {
                          date: formatSavedAt(item.savedAt, locale),
                        })}
                      </span>
                      {notIndexed && (
                        <span className="badge-not-indexed">{t("notIndexed")}</span>
                      )}
                    </div>
                    {desc ? (
                      <p className="fav-item__desc">{desc}</p>
                    ) : notIndexed ? (
                      <p className="fav-item__desc">{t("notIndexedHint")}</p>
                    ) : null}
                    <div className="fav-item__meta">
                      {delta != null && delta > 0 && (
                        <span className="delta">+{delta.toLocaleString()} ★</span>
                      )}
                      {health && (
                        <HealthDot
                          health={health}
                          label={healthT(health)}
                        />
                      )}
                      {tags?.slice(0, 3).map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                      {notIndexed && (
                        <a
                          className="fav-item__github-link"
                          href={githubRepoUrl(item.owner, item.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t("openGithub")}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="fav-item__aside">
                    <FavoriteButton
                      owner={item.owner}
                      name={item.name}
                      snapshot={item.snapshot}
                    />
                    <button
                      type="button"
                      className="fav-item__remove"
                      onClick={() => remove(item.owner, item.name)}
                    >
                      {t("remove")}
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
      </ul>

      <p className="favorites-privacy">{t("privacyNote")}</p>
    </div>
  );
}
