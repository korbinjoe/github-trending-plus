export interface GithubRepoSlug {
  owner: string;
  name: string;
}

const GITHUB_REPO_RE =
  /github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i;

/** Normalize owner/name for DB join (case-insensitive owner/name). */
export function normalizeGithubSlug(owner: string, name: string): GithubRepoSlug {
  let repoName = name.replace(/\.git$/i, "");
  const slash = repoName.indexOf("/");
  if (slash >= 0) {
    repoName = repoName.slice(0, slash);
  }
  return {
    owner: owner.toLowerCase(),
    name: repoName.toLowerCase(),
  };
}

export function parseGithubRepoUrl(url: string): GithubRepoSlug | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname.replace(/^www\./, "") !== "github.com") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const name = parts[1];
    if (!owner || !name) return null;
    if (["orgs", "organizations", "settings", "marketplace"].includes(owner.toLowerCase())) {
      return null;
    }
    return normalizeGithubSlug(owner, name);
  } catch {
    return null;
  }
}

export function extractGithubFromText(text: string | null | undefined): GithubRepoSlug | null {
  if (!text) return null;
  const match = text.match(GITHUB_REPO_RE);
  if (!match?.[1] || !match[2]) return null;
  return normalizeGithubSlug(match[1], match[2]);
}

export function githubRepoCanonicalUrl(owner: string, name: string): string {
  return `https://github.com/${owner}/${name}`;
}
