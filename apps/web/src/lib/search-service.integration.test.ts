import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { getDb } from "@github-trending/db";
import { repositories } from "@github-trending/db";
import { inArray } from "drizzle-orm";
import { searchRepositories } from "./search-service";

const hasDb = Boolean(process.env.DATABASE_URL);

const runId = Date.now().toString(36);
const SEED_OWNER = `fuzzy-test-${runId}`;
const RELEVANCE_OWNER = `fuzzy-rel-${runId}`;

const seedIds: string[] = [];

describe.skipIf(!hasDb)("searchRepositories integration", () => {
  beforeAll(async () => {
    const db = getDb();

    const inserted = await db
      .insert(repositories)
      .values([
        {
          owner: SEED_OWNER,
          name: "vector-db",
          fullName: `${SEED_OWNER}/vector-db`,
          description: "A vector database for embeddings and search",
          language: "TypeScript",
          topics: ["vector", "database"],
        },
        {
          owner: SEED_OWNER,
          name: "cli-tool",
          fullName: `${SEED_OWNER}/cli-tool`,
          description: "Command line utilities",
          language: "Go",
          topics: [`cli-${runId}`],
        },
        {
          owner: RELEVANCE_OWNER,
          name: "aaa-noise",
          fullName: `${RELEVANCE_OWNER}/aaa-noise`,
          description: `Notes on ZZAgentKit ${runId} ecosystem tools`,
          language: "Go",
          topics: [],
        },
        {
          owner: RELEVANCE_OWNER,
          name: "agent-kit",
          fullName: `${RELEVANCE_OWNER}/agent-kit`,
          description: `ZZAgentKit ${runId} framework for autonomous agents`,
          language: "Python",
          topics: ["ai"],
        },
      ])
      .returning({ id: repositories.id });

    for (const row of inserted) {
      seedIds.push(row.id);
    }
  });

  afterAll(async () => {
    if (seedIds.length === 0) return;
    const db = getDb();
    await db.delete(repositories).where(inArray(repositories.id, seedIds));
  });

  it("fuzzy typo vectro matches vector description", async () => {
    const result = await searchRepositories({
      q: "vectro",
      offset: 0,
      limit: 24,
    });
    const slugs = result.items.map((i) => i.slug);
    expect(slugs).toContain(`${SEED_OWNER}/vector-db`);
  });

  it("substring oven-sh/bun still matches when present in db", async () => {
    const result = await searchRepositories({
      q: "oven-sh/bun",
      offset: 0,
      limit: 24,
    });
    const slugs = result.items.map((i) => i.slug);
    expect(slugs.some((s) => s === "oven-sh/bun" || s.endsWith("/bun"))).toBe(
      true,
    );
  });

  it("tag-only search returns seeded cli repo", async () => {
    const result = await searchRepositories({
      tag: `cli-${runId}`,
      offset: 0,
      limit: 48,
    });
    expect(
      result.items.some((i) => i.slug === `${SEED_OWNER}/cli-tool`),
    ).toBe(true);
  });

  it("agent query ranks agent-kit before weaker aaa-noise match", async () => {
    const result = await searchRepositories({
      q: `ZZAgentKit ${runId}`,
      offset: 0,
      limit: 48,
    });
    const idxAgent = result.items.findIndex(
      (i) => i.slug === `${RELEVANCE_OWNER}/agent-kit`,
    );
    const idxNoise = result.items.findIndex(
      (i) => i.slug === `${RELEVANCE_OWNER}/aaa-noise`,
    );
    expect(idxAgent).toBeGreaterThanOrEqual(0);
    if (idxNoise >= 0) {
      expect(idxAgent).toBeLessThan(idxNoise);
    }
  });
});
