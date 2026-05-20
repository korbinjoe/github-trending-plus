export const PH_GRAPHQL_URL = "https://api.producthunt.com/v2/api/graphql";
export const PH_TOKEN_URL = "https://api.producthunt.com/v2/oauth/token";

export const DEFAULT_LOOKBACK_DAYS = 7;
export const DEFAULT_PAGE_SIZE = 50;
export const DEFAULT_TOPICS = ["developer-tools", "open-source"];

export const REDIRECT_TIMEOUT_MS = 5_000;
export const REDIRECT_MAX_HOPS = 5;
export const REDIRECT_CONCURRENCY = 5;
export const MAX_REDIRECT_RESOLVES_PER_BATCH = 100;

export function getLookbackDays(): number {
  const raw = process.env.PH_INGEST_LOOKBACK_DAYS;
  if (!raw) return DEFAULT_LOOKBACK_DAYS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LOOKBACK_DAYS;
}

export function getPageSize(): number {
  const raw = process.env.PH_INGEST_PAGE_SIZE;
  if (!raw) return DEFAULT_PAGE_SIZE;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 && n <= 50 ? n : DEFAULT_PAGE_SIZE;
}

export function getIngestTopics(): string[] {
  const raw = process.env.PH_INGEST_TOPICS?.trim();
  if (!raw) return DEFAULT_TOPICS;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function postedAfterDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}
