import { afterEach, describe, expect, it } from "vitest";
import {
  extractGithubFromText,
  normalizeGithubSlug,
  parseGithubRepoUrl,
} from "./github-url";
import { hasProductHuntCredentials, clearTokenCache } from "./auth";

describe("extractGithubFromText", () => {
  it("extracts owner/name from description", () => {
    expect(
      extractGithubFromText("Check out https://github.com/langchain-ai/langgraph"),
    ).toEqual({ owner: "langchain-ai", name: "langgraph" });
  });

  it("strips .git suffix", () => {
    expect(
      extractGithubFromText("github.com/acme/widget.git"),
    ).toEqual({ owner: "acme", name: "widget" });
  });

  it("returns null when no match", () => {
    expect(extractGithubFromText("no links here")).toBeNull();
  });
});

describe("parseGithubRepoUrl", () => {
  it("parses canonical repo URLs", () => {
    expect(parseGithubRepoUrl("https://github.com/oven-sh/bun")).toEqual({
      owner: "oven-sh",
      name: "bun",
    });
  });
});

describe("normalizeGithubSlug", () => {
  it("lowercases owner and name", () => {
    expect(normalizeGithubSlug("Oven-Sh", "Bun")).toEqual({
      owner: "oven-sh",
      name: "bun",
    });
  });
});

describe("hasProductHuntCredentials", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
    clearTokenCache();
  });

  it("returns false when unset", () => {
    delete process.env.PRODUCTHUNT_DEVELOPER_TOKEN;
    delete process.env.PRODUCTHUNT_API_KEY;
    delete process.env.PRODUCTHUNT_API_SECRET;
    expect(hasProductHuntCredentials()).toBe(false);
  });

  it("returns true with developer token", () => {
    process.env.PRODUCTHUNT_DEVELOPER_TOKEN = "test-token";
    expect(hasProductHuntCredentials()).toBe(true);
  });
});
