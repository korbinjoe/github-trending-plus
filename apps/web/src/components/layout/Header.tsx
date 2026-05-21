"use client";

import { getLocaleMeta, localeCatalog } from "@/i18n/locales";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { HeaderSearch } from "@/components/search/HeaderSearch";
import { GithubNavLink } from "./GithubNavLink";
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

  const navItems = [
    { href: "/", label: t("trending") },
    { href: "/subscribe", label: t("subscribe") },
    { href: "/favorites", label: t("favorites") },
    { href: "/about", label: t("about") },
  ] as const;

  return (
    <header className="site-header">
      <Link href="/" className="logo" aria-label="GitHub Trending+">
        <span className="logo-mark">
          <LogoMark />
        </span>
        <span className="logo__text">
          <span className="logo__prefix">GitHub </span>
          <span className="logo__name">Trending+</span>
        </span>
      </Link>
      <div className="site-header__center">
        <HeaderSearch />
      </div>
      <div className="site-header__end">
        <nav className="site-nav site-nav-seg" aria-label="Main">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={navLinkClass(pathname, href)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="site-header__tools">
          <GithubNavLink />
          <select
            id="ui-locale"
            className="lang-select lang-select--compact toolbar-control"
            aria-label={uiT("localeLabel")}
            title={getLocaleMeta(locale).label}
            value={locale}
            onChange={(e) => {
              const next = e.target.value as Locale;
              if (next === locale) return;
              router.replace(pathname, { locale: next });
            }}
          >
            {localeCatalog.map((loc) => (
              <option key={loc.code} value={loc.code} title={loc.label}>
                {loc.compactLabel}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
