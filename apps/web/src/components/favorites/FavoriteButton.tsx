"use client";

import type { FavoriteSnapshot } from "@github-trending/core/types";
import { useTranslations } from "next-intl";
import { useFavorites } from "@/hooks/useFavorites";

interface FavoriteButtonProps {
  owner: string;
  name: string;
  snapshot?: FavoriteSnapshot;
  variant?: "icon" | "labeled";
  className?: string;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="btn-favorite__icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

export function FavoriteButton({
  owner,
  name,
  snapshot,
  variant = "icon",
  className = "",
}: FavoriteButtonProps) {
  const t = useTranslations("favorites");
  const { isSaved, toggle, lastError } = useFavorites();
  const saved = isSaved(owner, name);
  const repoLabel = `${owner}/${name}`;

  const label = saved ? t("saved") : t("save");
  const ariaLabel = saved
    ? t("ariaRemove", { repo: repoLabel })
    : t("ariaSave", { repo: repoLabel });

  const handleClick = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(owner, name, snapshot);
  };

  const showLimitHint = lastError === "limit_reached";

  return (
    <span className="favorite-button-wrap">
      <button
        type="button"
        className={`btn-favorite${saved ? " is-saved" : ""}${
          variant === "labeled" ? " btn-favorite--with-label" : ""
        } ${className}`.trim()}
        aria-pressed={saved}
        aria-label={ariaLabel}
        title={label}
        onClick={handleClick}
      >
        <StarIcon filled={saved} />
        {variant === "labeled" && <span>{label}</span>}
      </button>
      {showLimitHint && (
        <span className="favorite-limit-hint" role="status">
          {t("limitReached")}
        </span>
      )}
    </span>
  );
}
