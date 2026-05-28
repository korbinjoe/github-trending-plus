/** Canonical open-source repository for this site (not a ranked repo slug). */
export const PROJECT_GITHUB_REPO = "korbinzhao/github-trending-plus" as const;

export function projectGithubUrl(): string {
  return `https://github.com/${PROJECT_GITHUB_REPO}`;
}

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

/** Absolute URL for an app path (e.g. `/feeds/all.xml`). */
export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}

export function repoUrl(owner: string, name: string): string {
  return `${getSiteUrl()}/repo/${owner}/${name}`;
}

export function launchUrl(slug: string): string {
  return `${getSiteUrl()}/launch/${slug}`;
}

export function compareUrl(slugs: string[]): string {
  const params = new URLSearchParams({ repos: slugs.join(",") });
  return `${getSiteUrl()}/compare?${params.toString()}`;
}

export function githubRepoUrl(owner: string, name: string): string {
  return `https://github.com/${owner}/${name}`;
}

export function ossInsightUrl(owner: string, name: string): string {
  return `https://ossinsight.io/analyze/${owner}/${name}`;
}

export function librariesIoUrl(owner: string, name: string): string {
  return `https://libraries.io/github/${owner}/${name}`;
}
