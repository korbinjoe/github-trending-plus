"use client";

import { localeCatalog } from "@/i18n/locales";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { LogoMark } from "./LogoMark";

function navLinkClass(pathname: string, href: string): string {
  const active =
    href === "/"
      ? pathname === "/" || pathname === ""
      : pathname === href || pathname.startsWith(`${href}/`);
  return active ? "is-active" : "";
}

export function Header() {
  const t = useTranslations("nav");
  const uiT = useTranslations("ui");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="site-header">
      <Link href="/" className="logo">
        <span className="logo-mark">
          <LogoMark />
        </span>
        GitHub Trending+
      </Link>
      <div className="header-end">
        <nav className="site-nav" aria-label="Main">
          <Link href="/" className={navLinkClass(pathname, "/")}>
            {t("trending")}
          </Link>
          <Link href="/subscribe" className={navLinkClass(pathname, "/subscribe")}>
            {t("subscribe")}
          </Link>
          <Link href="/favorites" className={navLinkClass(pathname, "/favorites")}>
            {t("favorites")}
          </Link>
          <Link href="/about" className={navLinkClass(pathname, "/about")}>
            {t("about")}
          </Link>
        </nav>
        <select
          id="ui-locale"
          className="lang-select"
          aria-label={uiT("localeLabel")}
          value={locale}
          onChange={(e) =>
            router.replace(pathname, { locale: e.target.value as Locale })
          }
        >
          {localeCatalog.map((loc) => (
            <option key={loc.code} value={loc.code}>
              {loc.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
