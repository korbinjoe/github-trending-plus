"use client";

import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="site-footer">
      <p>{t("data")}</p>
      <p>
        {t.rich("ph", {
          phLink: (chunks) => (
            <a
              href="https://www.producthunt.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {chunks}
            </a>
          ),
        })}
      </p>
    </footer>
  );
}
