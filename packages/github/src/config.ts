export const INGEST_LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Rust",
  "Go",
] as const;

export type IngestLanguage = (typeof INGEST_LANGUAGES)[number];

export const DAILY_CANDIDATE_CAP_PER_LANGUAGE = 200;

export const MIN_STARS_SEARCH = 50;

export function getSearchPushedSince(daysAgo = 30): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}
