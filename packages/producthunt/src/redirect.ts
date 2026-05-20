import { REDIRECT_MAX_HOPS, REDIRECT_TIMEOUT_MS } from "./config";
import { parseGithubRepoUrl } from "./github-url";

export async function resolveWebsiteUrl(
  redirectUrl: string,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REDIRECT_TIMEOUT_MS);

  try {
    let current = redirectUrl;
    for (let hop = 0; hop < REDIRECT_MAX_HOPS; hop++) {
      const res = await fetch(current, {
        method: "HEAD",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "github-trending-plus/1.0" },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) break;
        current = new URL(location, current).toString();
        continue;
      }

      if (res.status === 405 || res.status === 501) {
        const getRes = await fetch(current, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: { "User-Agent": "github-trending-plus/1.0" },
        });
        return getRes.url;
      }

      return res.url || current;
    }
    return current;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveGithubFromWebsite(
  website: string | null | undefined,
): Promise<{ url: string; owner: string; name: string } | null> {
  if (!website?.trim()) return null;
  const direct = parseGithubRepoUrl(website);
  if (direct) {
    return {
      url: `https://github.com/${direct.owner}/${direct.name}`,
      owner: direct.owner,
      name: direct.name,
    };
  }

  const final = await resolveWebsiteUrl(website);
  if (!final) return null;
  const slug = parseGithubRepoUrl(final);
  if (!slug) return null;
  return {
    url: final,
    owner: slug.owner,
    name: slug.name,
  };
}
