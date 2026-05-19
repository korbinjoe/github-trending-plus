import { describe, expect, it } from "vitest";
import { FavoritesHydrateRequestSchema } from "@github-trending/core/types";

describe("POST /api/favorites/hydrate request", () => {
  it("accepts up to 50 repos", () => {
    const repos = Array.from({ length: 50 }, (_, i) => ({
      owner: `o${i}`,
      name: `n${i}`,
    }));
    const parsed = FavoritesHydrateRequestSchema.safeParse({ repos });
    expect(parsed.success).toBe(true);
  });

  it("rejects more than 50 repos", () => {
    const repos = Array.from({ length: 51 }, (_, i) => ({
      owner: `o${i}`,
      name: `n${i}`,
    }));
    const parsed = FavoritesHydrateRequestSchema.safeParse({ repos });
    expect(parsed.success).toBe(false);
  });

  it("rejects empty repos array", () => {
    const parsed = FavoritesHydrateRequestSchema.safeParse({ repos: [] });
    expect(parsed.success).toBe(false);
  });

  it("rejects empty owner or name", () => {
    const parsed = FavoritesHydrateRequestSchema.safeParse({
      repos: [{ owner: "", name: "x" }],
    });
    expect(parsed.success).toBe(false);
  });
});
