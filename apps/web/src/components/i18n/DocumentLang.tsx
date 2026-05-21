"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

/** Syncs <html lang/dir> with the active next-intl locale. */
export function DocumentLang() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
