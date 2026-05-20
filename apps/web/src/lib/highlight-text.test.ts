import { describe, expect, it } from "vitest";
import { getHighlightSegments } from "./highlight-text";

function highlightedText(segments: ReturnType<typeof getHighlightSegments>) {
  return segments
    .filter((s) => s.highlight)
    .map((s) => s.text)
    .join("");
}

describe("getHighlightSegments", () => {
  it("returns plain text when query is empty", () => {
    expect(getHighlightSegments("hello world", "")).toEqual([
      { text: "hello world", highlight: false },
    ]);
  });

  it("highlights case-insensitive substring", () => {
    const segments = getHighlightSegments(
      "oven-sh/bun runtime",
      "oven-sh/bun",
    );
    expect(highlightedText(segments)).toBe("oven-sh/bun");
  });

  it("highlights fuzzy word match for typos", () => {
    const segments = getHighlightSegments(
      "A vector database for embeddings",
      "vectro",
    );
    expect(highlightedText(segments)).toBe("vector");
  });

  it("highlights multiple tokens", () => {
    const segments = getHighlightSegments(
      "AI agent framework for agents",
      "ai agent",
    );
    expect(highlightedText(segments)).toContain("AI");
    expect(highlightedText(segments)).toContain("agent");
  });
});
