import type { Locale } from "./routing";

export interface LocaleMeta {
  code: Locale;
  label: string;
  /** Short label for compact header control */
  compactLabel: string;
  htmlLang: string;
  dir: "ltr" | "rtl";
}

export const localeCatalog: LocaleMeta[] = [
  { code: "en", label: "English", compactLabel: "EN", htmlLang: "en", dir: "ltr" },
  { code: "zh", label: "中文", compactLabel: "中", htmlLang: "zh-CN", dir: "ltr" },
  { code: "es", label: "Español", compactLabel: "ES", htmlLang: "es", dir: "ltr" },
  { code: "ja", label: "日本語", compactLabel: "日", htmlLang: "ja", dir: "ltr" },
  { code: "ko", label: "한국어", compactLabel: "KO", htmlLang: "ko", dir: "ltr" },
  { code: "fr", label: "Français", compactLabel: "FR", htmlLang: "fr", dir: "ltr" },
  { code: "de", label: "Deutsch", compactLabel: "DE", htmlLang: "de", dir: "ltr" },
  { code: "pt", label: "Português", compactLabel: "PT", htmlLang: "pt", dir: "ltr" },
  { code: "ru", label: "Русский", compactLabel: "RU", htmlLang: "ru", dir: "ltr" },
  { code: "ar", label: "العربية", compactLabel: "ع", htmlLang: "ar", dir: "rtl" },
  { code: "hi", label: "हिन्दी", compactLabel: "HI", htmlLang: "hi", dir: "ltr" },
];

export function getLocaleMeta(code: string): LocaleMeta {
  const found = localeCatalog.find((l) => l.code === code);
  return found ?? localeCatalog[0]!;
}
