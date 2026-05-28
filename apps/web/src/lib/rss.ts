import { getDb } from "@github-trending/db";
import { periodMetrics, repositories } from "@github-trending/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { getCachedLatestCompletedRun } from "./ranking-run-cache";
import { getSiteUrl, repoUrl } from "./site";
import { toIsoString } from "./timestamp";

const RSS_PERIOD = "today" as const;
const RSS_VIEW = "velocity" as const;
const RSS_ITEM_LIMIT = 50;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emptyChannelRss(siteUrl: string, description: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Trending8</title>
<link>${siteUrl}</link>
<description>${escapeXml(description)}</description>
</channel></rss>`;
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
    return emptyChannelRss(siteUrl, "Database not configured");
  }

  const run = await getCachedLatestCompletedRun(RSS_PERIOD, RSS_VIEW);
  const pubIso = toIsoString(run?.completedAt);
  const pubDate = pubIso
    ? new Date(pubIso).toUTCString()
    : new Date().toUTCString();

  if (!run) {
    return emptyChannelRss(siteUrl, "No ranking data yet");
  }

  const conditions = [
    eq(periodMetrics.rankingRunId, run.id),
    eq(periodMetrics.period, RSS_PERIOD),
    eq(periodMetrics.view, RSS_VIEW),
  ];

  if (options?.language) {
    conditions.push(eq(periodMetrics.language, options.language));
  }

  if (options?.topic) {
    const topicLower = options.topic.toLowerCase();
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${repositories.topics}) AS elem
        WHERE lower(elem::text) = ${topicLower}
      )`,
    );
  }

  const rows = await db
    .select({ repo: repositories })
    .from(periodMetrics)
    .innerJoin(repositories, eq(periodMetrics.repoId, repositories.id))
    .where(and(...conditions))
    .orderBy(asc(periodMetrics.velocityRank))
    .limit(RSS_ITEM_LIMIT);

  const items = rows.map(({ repo }) => {
    const link = repoUrl(repo.owner, repo.name);
    const title = `${repo.owner}/${repo.name}`;
    const desc = escapeXml(repo.description ?? "");

    return `<item>
  <title>${escapeXml(title)}</title>
  <link>${link}</link>
  <guid>${link}</guid>
  <description>${desc}</description>
  <pubDate>${pubDate}</pubDate>
</item>`;
  });

  const channelTitle = options?.language
    ? `Trending8 — ${options.language}`
    : options?.topic
      ? `Trending8 — ${options.topic}`
      : "Trending8";

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
