import type { PhSignal } from "@github-trending/core/types";
import type { Database } from "@github-trending/db";
import { productHuntPosts } from "@github-trending/db";
import { eq, inArray, isNotNull } from "drizzle-orm";
import { findRepositoryId } from "./linking";

function rowToPhSignal(row: {
  slug: string;
  phUrl: string;
  votesCount: number;
  featuredAt: Date | null;
  postedAt: Date;
  tagline: string | null;
}): PhSignal {
  return {
    slug: row.slug,
    phUrl: row.phUrl,
    votesCount: row.votesCount,
    featuredAt: row.featuredAt?.toISOString() ?? null,
    postedAt: row.postedAt.toISOString(),
    tagline: row.tagline ?? undefined,
  };
}

/** Latest PH launch per repository (featured_at preferred over posted_at). */
export async function getPhSignalsForRepoIds(
  db: Database,
  repoIds: string[],
): Promise<Map<string, PhSignal>> {
  if (repoIds.length === 0) return new Map();

  const rows = await db
    .select()
    .from(productHuntPosts)
    .where(inArray(productHuntPosts.repoId, repoIds));

  const bestByRepo = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!row.repoId) continue;
    const existing = bestByRepo.get(row.repoId);
    if (!existing) {
      bestByRepo.set(row.repoId, row);
      continue;
    }
    const rowScore = row.featuredAt?.getTime() ?? row.postedAt.getTime();
    const existingScore =
      existing.featuredAt?.getTime() ?? existing.postedAt.getTime();
    if (rowScore > existingScore) {
      bestByRepo.set(row.repoId, row);
    }
  }

  const result = new Map<string, PhSignal>();
  for (const [repoId, row] of bestByRepo) {
    result.set(repoId, rowToPhSignal(row));
  }
  return result;
}

export async function getPhSignalForRepoId(
  db: Database,
  repoId: string,
): Promise<PhSignal | null> {
  const map = await getPhSignalsForRepoIds(db, [repoId]);
  return map.get(repoId) ?? null;
}

export async function relinkUnlinkedPosts(db: Database): Promise<number> {
  const rows = await db
    .select()
    .from(productHuntPosts)
    .where(isNotNull(productHuntPosts.githubOwner));

  let count = 0;
  for (const row of rows) {
    if (row.repoId || !row.githubOwner || !row.githubName) continue;
    const repoId = await findRepositoryId(db, {
      owner: row.githubOwner,
      name: row.githubName,
    });
    if (!repoId) continue;
    await db
      .update(productHuntPosts)
      .set({ repoId, updatedAt: new Date() })
      .where(eq(productHuntPosts.id, row.id));
    count += 1;
  }
  return count;
}
