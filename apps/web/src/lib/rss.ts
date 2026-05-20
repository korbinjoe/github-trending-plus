import { getDb } from "@github-trending/db";
import { periodMetrics, repositories } from "@github-trending/db";
import { asc, eq } from "drizzle-orm";
import { getCachedLatestCompletedRun } from "./ranking-run-cache";
import { getSiteUrl, repoUrl } from "./site";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function buildRssFeed(options?: {
  language?: string;
  topic?: string;
}): Promise<string> {
  const siteUrl = getSiteUrl();

  let db;
  try {
    db = getDb();
  } catch {
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>GitHub Trending+</title>
<link>${siteUrl}</link>
<description>Database not configured</description>
</channel></rss>`;
  }
  const run = await getCachedLatestCompletedRun("today", "velocity");
  const pubDate = run?.completedAt?.toUTCString() ?? new Date().toUTCString();

  if (!run) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>GitHub Trending+</title>
<link>${siteUrl}</link>
<description>No ranking data yet</description>
</channel></rss>`;
  }

  const metrics = await db
    .select()
    .from(periodMetrics)
    .where(eq(periodMetrics.rankingRunId, run.id))
    .orderBy(asc(periodMetrics.velocityRank))
    .limit(50);

  const items: string[] = [];

  for (const m of metrics) {
    const repoRows = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, m.repoId))
      .limit(1);
    const repo = repoRows[0];
    if (!repo) continue;

    if (options?.language && repo.language !== options.language) continue;

    const topics = (repo.topics as string[]) ?? [];
    if (
      options?.topic &&
      !topics.some((t) => t.toLowerCase() === options.topic?.toLowerCase())
    ) {
      continue;
    }

    const link = repoUrl(repo.owner, repo.name);
    const title = `${repo.owner}/${repo.name}`;
    const desc = escapeXml(repo.description ?? "");

    items.push(`<item>
  <title>${escapeXml(title)}</title>
  <link>${link}</link>
  <guid>${link}</guid>
  <description>${desc}</description>
  <pubDate>${pubDate}</pubDate>
</item>`);
  }

  const channelTitle = options?.language
    ? `GitHub Trending+ — ${options.language}`
    : "GitHub Trending+";

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(channelTitle)}</title>
  <link>${siteUrl}</link>
  <description>Velocity-ranked open source repositories</description>
  <lastBuildDate>${pubDate}</lastBuildDate>
  ${items.join("\n  ")}
</channel>
</rss>`;
}

export const RSS_CACHE_HEADERS = {
  "Content-Type": "application/rss+xml; charset=utf-8",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
};
