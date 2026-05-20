import { SearchResponseSchema } from "@github-trending/core/types";
import { describe, expect, it } from "vitest";
import {
  escapeIlikePattern,
  isKeywordQueryValid,
  parseSearchParams,
  sanitizeSearchQuery,
} from "./search-query";

describe("search-query", () => {
  it("escapes SQL wildcards", () => {
    expect(escapeIlikePattern("100%")).toBe("100\\%");
    expect(escapeIlikePattern("a_b")).toBe("a\\_b");
  });

  it("validates minimum keyword length", () => {
    expect(isKeywordQueryValid("a")).toBe(false);
    expect(isKeywordQueryValid("ai")).toBe(true);
  });

  it("rejects empty q and tag", () => {
    const result = parseSearchParams({ q: "", tag: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("allows tag-only search", () => {
    const result = parseSearchParams({ tag: "cli" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tag).toBe("cli");
      expect(result.q).toBeUndefined();
    }
  });

  it("rejects short keyword without tag", () => {
    const result = parseSearchParams({ q: "a" });
    expect(result.ok).toBe(false);
  });

  it("accepts keyword and tag together", () => {
    const result = parseSearchParams({ q: "agent", tag: "cli" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.q).toBe("agent");
      expect(result.tag).toBe("cli");
    }
  });

  it("parses cursor and limit", () => {
    const result = parseSearchParams({
      q: "react",
      cursor: "24",
      limit: "10",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.offset).toBe(24);
      expect(result.limit).toBe(10);
    }
  });

  it("trims whitespace", () => {
    expect(sanitizeSearchQuery("  bun  ")).toBe("bun");
  });
});

describe("SearchResponseSchema", () => {
  it("validates minimal search payload", () => {
    const parsed = SearchResponseSchema.safeParse({
      items: [
        {
          rank: 1,
          owner: "o",
          name: "n",
          slug: "o/n",
          description: "d",
          deltaStars: 1,
          totalStars: 10,
          health: "active",
          tags: [],
          isEarlySignal: false,
          alternatives: [],
        },
      ],
      nextCursor: null,
    });
    expect(parsed.success).toBe(true);
  });
});
