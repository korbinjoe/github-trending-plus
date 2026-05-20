import { eq } from "drizzle-orm";
import type { Database } from "@github-trending/db";
import { ingestErrors, repositories, repositorySnapshots } from "@github-trending/db";
import type { SearchRepoNode } from "./search";
import { upsertRepoStarDailyToday } from "./repo-star-daily";

function parseOwnerName(nameWithOwner: string): { owner: string; name: string } {
  const [owner, ...rest] = nameWithOwner.split("/");
  return { owner: owner ?? "", name: rest.join("/") };
}

function extractCommits30d(node: SearchRepoNode): number {
  const history = node.defaultBranchRef?.target?.history;
  return history?.totalCount ?? 0;
}

export async function upsertRepositorySnapshot(
  db: Database,
  node: SearchRepoNode,
): Promise<string> {
  const { owner, name } = parseOwnerName(node.nameWithOwner);
  const topics = node.repositoryTopics.nodes.map((n) => n.topic.name);

  const existing = await db
    .select({ id: repositories.id })
    .from(repositories)
    .where(eq(repositories.fullName, node.nameWithOwner))
    .limit(1);

  let repoId: string;

  if (existing[0]) {
    repoId = existing[0].id;
    await db
      .update(repositories)
      .set({
        description: node.description,
        language: node.primaryLanguage?.name ?? null,
        license: node.licenseInfo?.spdxId ?? null,
        topics,
        isFork: node.isFork ? 1 : 0,
        updatedAt: new Date(),
      })
      .where(eq(repositories.id, repoId));
  } else {
    const inserted = await db
      .insert(repositories)
      .values({
        owner,
        name,
        fullName: node.nameWithOwner,
        description: node.description,
        language: node.primaryLanguage?.name ?? null,
        license: node.licenseInfo?.spdxId ?? null,
        topics,
        isFork: node.isFork ? 1 : 0,
        githubId: node.databaseId,
      })
      .returning({ id: repositories.id });
    const row = inserted[0];
    if (!row) throw new Error(`Failed to insert repository ${node.nameWithOwner}`);
    repoId = row.id;
  }

  await db.insert(repositorySnapshots).values({
    repoId,
    stars: node.stargazerCount,
    forks: node.forkCount,
    openIssues: 0,
    commits30d: extractCommits30d(node),
    pushedAt: node.pushedAt ? new Date(node.pushedAt) : null,
  });

  await upsertRepoStarDailyToday(db, repoId, node.stargazerCount);

  return repoId;
}

export async function logIngestError(
  db: Database,
  owner: string | null,
  name: string | null,
  message: string,
  source?: string,
): Promise<void> {
  await db.insert(ingestErrors).values({ owner, name, message, source });
}
