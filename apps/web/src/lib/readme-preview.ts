import { posix } from "node:path";

interface GitHubReadmeResponse {
  content?: string;
  encoding?: string;
  path?: string;
  html_url?: string;
}

interface GitHubRepoResponse {
  default_branch?: string;
}

export interface ReadmeRewriteContext {
  owner: string;
  name: string;
  branch: string;
  /** README file path in repo, e.g. README.md or docs/README.md */
  readmePath: string;
}

/** README longer than this shows the expand control (full content still in DOM). */
const COLLAPSE_MIN_CHARS = 3500;
const COLLAPSE_MIN_LINES = 55;

const MD_IMAGE_RE = /!\[([^\]]*)]\(([^)]+)\)/g;
const MD_LINK_RE = /(?<![!])\[([^\]]*)]\(([^)]+)\)/g;
const HTML_IMG_SRC_RE =
  /<img\b([^>]*?)\bsrc=(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))([^>]*)>/gi;
const HTML_SRCSET_RE = /\bsrcset=(["'])([^"']+)\1/gi;

export function isReadmeCollapsible(markdown: string): boolean {
  return markdown.length >= COLLAPSE_MIN_CHARS || markdown.split("\n").length >= COLLAPSE_MIN_LINES;
}

export function parseBranchFromReadmeHtmlUrl(htmlUrl: string): string | null {
  const match = htmlUrl.match(/github\.com\/[^/]+\/[^/]+\/blob\/([^/]+)\//i);
  return match?.[1] ?? null;
}

export function readmeDirectory(readmePath: string): string {
  const normalized = posix.normalize(readmePath.replace(/\\/g, "/"));
  const dir = posix.dirname(normalized);
  return dir === "." ? "" : dir;
}

/** Split markdown `(...)` link target into URL and trailing title fragment. */
export function parseMarkdownLinkTarget(raw: string): { url: string; rest: string } {
  const trimmed = raw.trim();
  if (trimmed.startsWith("<")) {
    const close = trimmed.indexOf(">");
    if (close > 1) {
      return {
        url: trimmed.slice(1, close),
        rest: trimmed.slice(close + 1),
      };
    }
  }

  const titleMatch = trimmed.match(
    /^(.+?)\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*$/,
  );
  if (titleMatch) {
    return {
      url: titleMatch[1].trim(),
      rest: trimmed.slice(titleMatch[1].length),
    };
  }

  return { url: trimmed, rest: "" };
}

/** Resolve relative README asset paths to absolute GitHub raw/blob URLs. */
export function rewriteReadmeRelativeUrls(
  markdown: string,
  context: ReadmeRewriteContext,
): string {
  const { owner, name, branch, readmePath } = context;
  const readmeDir = readmeDirectory(readmePath);
  const rawBase = `https://raw.githubusercontent.com/${owner}/${name}/${branch}`;
  const blobBase = `https://github.com/${owner}/${name}/blob/${branch}`;

  let result = markdown.replace(MD_IMAGE_RE, (_match, alt: string, inner: string) => {
    const { url, rest } = parseMarkdownLinkTarget(inner);
    const resolved = resolveReadmeAssetUrl(url, rawBase, readmeDir, "image", owner, name);
    return `![${alt}](${resolved}${rest})`;
  });

  result = result.replace(MD_LINK_RE, (_match, label: string, inner: string) => {
    const { url, rest } = parseMarkdownLinkTarget(inner);
    const resolved = resolveReadmeAssetUrl(url, blobBase, readmeDir, "link", owner, name);
    return `[${label}](${resolved}${rest})`;
  });

  result = result.replace(
    HTML_IMG_SRC_RE,
    (_match, before: string, dq: string | undefined, sq: string | undefined, bare: string | undefined, after: string) => {
      const src = dq ?? sq ?? bare ?? "";
      const resolved = resolveReadmeAssetUrl(src, rawBase, readmeDir, "image", owner, name);
      const srcAttr =
        dq !== undefined ? `"${resolved}"` : sq !== undefined ? `'${resolved}'` : resolved;
      return `<img${before}src=${srcAttr}${after}>`;
    },
  );

  result = result.replace(HTML_SRCSET_RE, (_match, quote: string, srcset: string) => {
    const resolved = srcset
      .split(",")
      .map((part) => {
        const trimmed = part.trim();
        const space = trimmed.indexOf(" ");
        if (space === -1) {
          return resolveReadmeAssetUrl(trimmed, rawBase, readmeDir, "image", owner, name);
        }
        const url = trimmed.slice(0, space);
        const descriptor = trimmed.slice(space);
        return `${resolveReadmeAssetUrl(url, rawBase, readmeDir, "image", owner, name)}${descriptor}`;
      })
      .join(", ");
    return `srcset=${quote}${resolved}${quote}`;
  });

  return result;
}

function resolveReadmeAssetUrl(
  href: string,
  base: string,
  readmeDir: string,
  kind: "image" | "link",
  owner: string,
  name: string,
): string {
  let trimmed = href.trim();
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    trimmed = trimmed.slice(1, -1);
  }
  const { path, suffix } = splitUrlSuffix(trimmed);
  if (!path) return href;

  if (isAbsoluteUrl(path)) {
    const normalized = normalizeGitHubMediaUrl(path, owner, name, kind);
    return `${normalized}${suffix}`;
  }

  if (path.startsWith("//")) {
    return `https:${path}${suffix}`;
  }

  const repoRelative = extractRepoRelativePath(path, owner, name);
  const filePath = repoRelative ?? resolvePathFromReadme(readmeDir, path);
  const baseWithSlash = base.endsWith("/") ? base : `${base}/`;
  try {
    return new URL(filePath, baseWithSlash).href + suffix;
  } catch {
    return `${baseWithSlash}${filePath}${suffix}`;
  }
}

function splitUrlSuffix(url: string): { path: string; suffix: string } {
  const hashIdx = url.indexOf("#");
  const queryIdx = url.indexOf("?");
  let cut = url.length;
  if (hashIdx !== -1) cut = Math.min(cut, hashIdx);
  if (queryIdx !== -1) cut = Math.min(cut, queryIdx);
  return {
    path: url.slice(0, cut),
    suffix: url.slice(cut),
  };
}

function isAbsoluteUrl(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("data:");
}

function resolvePathFromReadme(readmeDir: string, relativePath: string): string {
  let path = relativePath;
  if (path.startsWith("./")) path = path.slice(2);
  if (path.startsWith("/")) path = path.slice(1);
  const combined = readmeDir ? posix.join(readmeDir, path) : path;
  return posix.normalize(combined).replace(/^(\.\/)+/, "");
}

/** Paths like /owner/repo/blob/main/assets/x.png embedded in README HTML. */
function extractRepoRelativePath(
  path: string,
  owner: string,
  name: string,
): string | null {
  const blob = path.match(
    new RegExp(`^/?${owner}/${name}/blob/[^/]+/(.+)$`, "i"),
  );
  if (blob?.[1]) return blob[1];

  const raw = path.match(
    new RegExp(`^/?${owner}/${name}/raw/[^/]+/(.+)$`, "i"),
  );
  if (raw?.[1]) return raw[1];

  return null;
}

/** Normalize github.com blob/raw links to raw.githubusercontent.com for images. */
function normalizeGitHubMediaUrl(
  url: string,
  owner: string,
  name: string,
  kind: "image" | "link",
): string {
  if (kind === "link") {
    return url;
  }

  const blob = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i,
  );
  if (blob) {
    const [, o, n, branch, filePath] = blob;
    return `https://raw.githubusercontent.com/${o}/${n}/${branch}/${filePath}`;
  }

  const ghRaw = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.+)$/i,
  );
  if (ghRaw) {
    const [, o, n, branch, filePath] = ghRaw;
    return `https://raw.githubusercontent.com/${o}/${n}/${branch}/${filePath}`;
  }

  // Already on raw.githubusercontent.com or external CDN
  if (
    url.includes("raw.githubusercontent.com") ||
    url.includes("user-images.githubusercontent.com") ||
    url.includes("camo.githubusercontent.com")
  ) {
    return url;
  }

  // github.com/owner/repo paths without blob/raw are rare for images; try repo match
  const repoPath = extractRepoRelativePath(
    url.replace(/^https?:\/\/github\.com\//i, ""),
    owner,
    name,
  );
  if (repoPath) {
    const branch =
      url.match(/\/blob\/([^/]+)\//i)?.[1] ??
      url.match(/\/raw\/([^/]+)\//i)?.[1] ??
      "main";
    return `https://raw.githubusercontent.com/${owner}/${name}/${branch}/${repoPath}`;
  }

  return url;
}

async function fetchDefaultBranch(
  owner: string,
  name: string,
  token: string,
): Promise<string> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) return "main";
  const body = (await res.json()) as GitHubRepoResponse;
  return body.default_branch ?? "main";
}

export async function fetchRepoReadmeMarkdown(
  owner: string,
  name: string,
): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  const readmeUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/readme`;
  const res = await fetch(readmeUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) return null;

  const body = (await res.json()) as GitHubReadmeResponse;
  if (body.encoding !== "base64" || !body.content) return null;

  const raw = Buffer.from(body.content, "base64").toString("utf-8");
  const readmePath = body.path ?? "README.md";
  const branchFromHtml = body.html_url
    ? parseBranchFromReadmeHtmlUrl(body.html_url)
    : null;
  const branch =
    branchFromHtml ?? (await fetchDefaultBranch(owner, name, token));

  return rewriteReadmeRelativeUrls(raw, {
    owner,
    name,
    branch,
    readmePath,
  });
}

export async function getRepoReadmeMarkdown(
  owner: string,
  name: string,
): Promise<string | null> {
  return fetchRepoReadmeMarkdown(owner, name);
}
