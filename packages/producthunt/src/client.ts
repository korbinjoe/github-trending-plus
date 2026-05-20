import { getAccessToken } from "./auth";
import { PH_GRAPHQL_URL } from "./config";
import { ProductHuntRateLimitError } from "./errors";

export interface GraphQLErrorItem {
  message: string;
}

export interface RateLimitHeaders {
  remaining: number | null;
  reset: string | null;
}

function parseRateLimit(res: Response): RateLimitHeaders {
  const remaining = res.headers.get("X-Rate-Limit-Remaining");
  const reset = res.headers.get("X-Rate-Limit-Reset");
  return {
    remaining: remaining ? Number.parseInt(remaining, 10) : null,
    reset,
  };
}

export async function phGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
  logger?: { warn: (msg: string, meta?: Record<string, unknown>) => void },
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(PH_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const rate = parseRateLimit(res);
  if (rate.remaining !== null && rate.remaining < 5) {
    logger?.warn("ph_rate_limit_low", {
      remaining: rate.remaining,
      reset: rate.reset,
    });
  }

  if (res.status === 429) {
    throw new ProductHuntRateLimitError(
      "Product Hunt rate limit exceeded",
      rate.reset,
    );
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Product Hunt GraphQL HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    data?: T;
    errors?: GraphQLErrorItem[];
  };

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }

  if (!json.data) {
    throw new Error("Product Hunt GraphQL returned no data");
  }

  return json.data;
}
