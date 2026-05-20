import { utcDateDaysAgo, utcToday, type StarHistoryPoint } from "@github-trending/core";
import type { Database } from "@github-trending/db";
import { repoStarDaily } from "@github-trending/db";
import { and, asc, eq, gte, sql } from "drizzle-orm";

const UPSERT_CHUNK = 100;

let dailyByRepoCache: {
  fromDate: string;
  data: Map<string, StarHistoryPoint[]>;
} | null = null;

export function clearRepoStarDailyCache(): void {
  dailyByRepoCache = null;
}

export type StarDailySource = "ossinsight" | "github";

export async function upsertRepoStarDailyRows(
  db: Database,
  repoId: string,
  rows: StarHistoryPoint[],
  source: StarDailySource,
): Promise<number> {
  if (rows.length === 0) return 0;

  let upserted = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    await db
      .insert(repoStarDaily)
      .values(
        chunk.map((row) => ({
          repoId,
          date: row.date,
          stars: row.stargazers,
          source,
        })),
      )
      .onConflictDoUpdate({
        target: [repoStarDaily.repoId, repoStarDaily.date],
        set: {
          stars: sql`excluded.stars`,
          source: sql`excluded.source`,
          ingestedAt: sql`now()`,
        },
      });
    upserted += chunk.length;
  }
  return upserted;
}

export async function upsertRepoStarDailyToday(
  db: Database,
  repoId: string,
  stars: number,
): Promise<void> {
  await upsertRepoStarDailyRows(
    db,
    repoId,
    [{ date: utcToday(), stargazers: stars }],
    "github",
  );
}

export async function loadRepoStarDaily(
  db: Database,
  repoId: string,
  fromDate?: string,
): Promise<StarHistoryPoint[]> {
  const conditions = [eq(repoStarDaily.repoId, repoId)];
  if (fromDate) {
    conditions.push(gte(repoStarDaily.date, fromDate));
  }

  const rows = await db
    .select({
      date: repoStarDaily.date,
      stars: repoStarDaily.stars,
    })
    .from(repoStarDaily)
    .where(and(...conditions))
    .orderBy(asc(repoStarDaily.date));

  return rows.map((row) => ({
    date: String(row.date),
    stargazers: row.stars,
  }));
}

export async function loadAllRepoStarDailyByRepo(
  db: Database,
  fromDate: string,
): Promise<Map<string, StarHistoryPoint[]>> {
  if (dailyByRepoCache?.fromDate === fromDate) {
    return dailyByRepoCache.data;
  }

  const rows = await db
    .select({
      repoId: repoStarDaily.repoId,
      date: repoStarDaily.date,
      stars: repoStarDaily.stars,
    })
    .from(repoStarDaily)
    .where(gte(repoStarDaily.date, fromDate))
    .orderBy(asc(repoStarDaily.repoId), asc(repoStarDaily.date));

  const byRepo = new Map<string, StarHistoryPoint[]>();
  for (const row of rows) {
    const list = byRepo.get(row.repoId) ?? [];
    list.push({ date: String(row.date), stargazers: row.stars });
    byRepo.set(row.repoId, list);
  }
  dailyByRepoCache = { fromDate, data: byRepo };
  return byRepo;
}

export async function hasStarDailyCoverage(
  db: Database,
  repoId: string,
  minDays = 365,
): Promise<boolean> {
  const minBound = utcDateDaysAgo(minDays);
  const yesterday = utcDateDaysAgo(1);

  const rows = await db
    .select({ date: repoStarDaily.date })
    .from(repoStarDaily)
    .where(eq(repoStarDaily.repoId, repoId))
    .orderBy(asc(repoStarDaily.date));

  if (rows.length === 0) return false;

  const dates = rows.map((r) => String(r.date));
  const earliest = dates[0];
  const latest = dates[dates.length - 1];
  if (!earliest || !latest) return false;

  return earliest <= minBound && latest >= yesterday;
}
