import { PH_TOKEN_URL } from "./config";
import { ProductHuntConfigError } from "./errors";

interface TokenCache {
  token: string;
  expiresAtMs: number;
}

let cache: TokenCache | null = null;

function developerToken(): string | null {
  const t = process.env.PRODUCTHUNT_DEVELOPER_TOKEN?.trim();
  return t || null;
}

function clientCredentials(): { key: string; secret: string } | null {
  const key = process.env.PRODUCTHUNT_API_KEY?.trim();
  const secret = process.env.PRODUCTHUNT_API_SECRET?.trim();
  if (key && secret) return { key, secret };
  return null;
}

export function hasProductHuntCredentials(): boolean {
  return Boolean(developerToken() || clientCredentials());
}

export function clearTokenCache(): void {
  cache = null;
}

export async function getAccessToken(): Promise<string> {
  const dev = developerToken();
  if (dev) return dev;

  const creds = clientCredentials();
  if (!creds) {
    throw new ProductHuntConfigError();
  }

  if (cache && cache.expiresAtMs > Date.now() + 60_000) {
    return cache.token;
  }

  const res = await fetch(PH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: creds.key,
      client_secret: creds.secret,
      grant_type: "client_credentials",
    }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new ProductHuntConfigError("Product Hunt token exchange rejected");
  }

  if (!res.ok) {
    throw new Error(`Product Hunt token HTTP ${res.status}`);
  }

  const body = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!body.access_token) {
    throw new Error("Product Hunt token response missing access_token");
  }

  const expiresIn = body.expires_in ?? 3600;
  cache = {
    token: body.access_token,
    expiresAtMs: Date.now() + expiresIn * 1000,
  };

  return cache.token;
}
