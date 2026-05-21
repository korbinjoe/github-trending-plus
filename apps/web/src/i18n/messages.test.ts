import { describe, expect, it } from "vitest";
import ar from "../../messages/ar.json";
import de from "../../messages/de.json";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import fr from "../../messages/fr.json";
import hi from "../../messages/hi.json";
import ja from "../../messages/ja.json";
import ko from "../../messages/ko.json";
import pt from "../../messages/pt.json";
import ru from "../../messages/ru.json";
import zh from "../../messages/zh.json";

function leafKeys(
  obj: Record<string, unknown>,
  prefix = "",
): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out.push(...leafKeys(value as Record<string, unknown>, path));
    } else {
      out.push(path);
    }
  }
  return out;
}

const bundles: Record<string, Record<string, unknown>> = {
  en,
  zh,
  es,
  ja,
  ko,
  fr,
  de,
  pt,
  ru,
  ar,
  hi,
};

describe("locale message bundles", () => {
  const enKeys = new Set(leafKeys(en));

  for (const [locale, messages] of Object.entries(bundles)) {
    if (locale === "en") continue;

    it(`${locale}.json includes every en.json key`, () => {
      const keys = new Set(leafKeys(messages));
      const missing = [...enKeys].filter((k) => !keys.has(k));
      expect(missing, `missing in ${locale}`).toEqual([]);
    });
  }
});
