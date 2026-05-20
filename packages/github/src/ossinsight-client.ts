import {
  parseOssInsightStargazers,
  type StarHistoryPoint,
} from "@github-trending/core";

const OSSINSIGHT_BASE = "https://api.ossinsight.io/v1";

export interface OssInsightClientOptions {
  /** Minimum delay between requests (OSS Insight: ~600/hour per IP). */
  requestDelayMs?: number;
  maxRetries?: number;
}

interface OssInsightHistoryResponse {
  data?: {
    rows?: Array<{ date: string; stargazers: string | number }>;
  };
  message?: string;
}

let lastRequestAt = 0;

async function throttle(delayMs: number): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < delayMs) {
    await new Promise((r) => setTimeout(r, delayMs - elapsed));
  }
  lastRequestAt = Date.now();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class OssInsightRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OssInsightRateLimitError";
  }
}

export class OssInsightClient {
  private readonly requestDelayMs: number;
  private readonly maxRetries: number;

  constructor(options?: OssInsightClientOptions) {
    this.requestDelayMs = options?.requestDelayMs ?? 6_200;
    this.maxRetries = options?.maxRetries ?? 5;
  }

  async fetchStargazerHistory(
    owner: string,
    repo: string,
    fromDate: string,
  ): Promise<StarHistoryPoint[]> {
    const url = new URL(
      `${OSSINSIGHT_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stargazers/history/`,
    );
    url.searchParams.set("per", "day");
    url.searchParams.set("from", fromDate);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      await throttle(this.requestDelayMs);

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (res.status === 429) {
        const waitMs = Math.min(60_000 * attempt, 300_000);
        if (attempt >= this.maxRetries) {
          throw new OssInsightRateLimitError(
            `OSS Insight rate limit after ${attempt} attempts`,
          );
        }
        await sleep(waitMs);
        continue;
      }

      const body = (await res.json()) as OssInsightHistoryResponse;

      if (!res.ok) {
        const msg = body.message ?? `HTTP ${res.status}`;
        if (res.status === 404 || msg.includes("404")) {
          return [];
        }
        throw new Error(`OSS Insight ${owner}/${repo}: ${msg}`);
      }

      const rows = body.data?.rows ?? [];
      return rows.map((row) => ({
        date: row.date,
        stargazers: parseOssInsightStargazers(row.stargazers),
      }));
    }

    throw new OssInsightRateLimitError("OSS Insight request exhausted retries");
  }
}
