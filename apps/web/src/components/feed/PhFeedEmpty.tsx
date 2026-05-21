"use client";

import { useTranslations } from "next-intl";

interface PhFeedEmptyProps {
  linkedOnly: boolean;
}

export function PhFeedEmpty({ linkedOnly }: PhFeedEmptyProps) {
  const t = useTranslations("feed");

  return (
    <div className="feed-empty ph-feed-empty">
      <p>{linkedOnly ? t("phEmptyLinked") : t("phEmpty")}</p>
    </div>
  );
}
