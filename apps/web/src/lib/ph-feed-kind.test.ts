import { describe, expect, it } from "vitest";
import { classifyPhEntryKind } from "./ph-feed-kind";
import type { PhLeaderboardRow } from "@github-trending/producthunt";

function mockRow(
  overrides: Partial<PhLeaderboardRow>,
): PhLeaderboardRow {
  return {
    id: "1",
    phId: "ph1",
    slug: "my-app",
    name: "My App",
    tagline: null,
    description: null,
    phUrl: "https://www.producthunt.com/posts/my-app",
    websiteRedirect: null,
    resolvedUrl: null,
    githubOwner: null,
    githubName: null,
    repoId: null,
    votesCount: 10,
    commentsCount: 0,
    featuredAt: null,
    postedAt: new Date("2026-05-01T00:00:00Z"),
    topics: [],
    matchedVia: null,
    ingestedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("classifyPhEntryKind", () => {
  it("returns repo when repo_id is set", () => {
    expect(classifyPhEntryKind(mockRow({ repoId: "uuid" }))).toBe("repo");
  });

  it("returns launch when github slug without repo_id", () => {
    expect(
      classifyPhEntryKind(
        mockRow({ githubOwner: "octo", githubName: "hello" }),
      ),
    ).toBe("launch");
  });

  it("returns product when no github fields", () => {
    expect(classifyPhEntryKind(mockRow({}))).toBe("product");
  });
});
