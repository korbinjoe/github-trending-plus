/**
 * Merge en.json structure with per-locale override files (messages/overrides/<locale>.json).
 * Run: node scripts/merge-locale-messages.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "../messages");
const overridesDir = path.join(messagesDir, "overrides");

const en = JSON.parse(
  fs.readFileSync(path.join(messagesDir, "en.json"), "utf8"),
);

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      if (!target[key] || typeof target[key] !== "object") {
        target[key] = {};
      }
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

const locales = fs
  .readdirSync(overridesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));

for (const locale of locales) {
  const override = JSON.parse(
    fs.readFileSync(path.join(overridesDir, `${locale}.json`), "utf8"),
  );
  const merged = structuredClone(en);
  deepMerge(merged, override);
  fs.writeFileSync(
    path.join(messagesDir, `${locale}.json`),
    `${JSON.stringify(merged, null, 2)}\n`,
  );
  console.log(`Wrote messages/${locale}.json`);
}
