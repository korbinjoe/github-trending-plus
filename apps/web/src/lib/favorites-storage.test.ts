import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addFavorite,
  clearFavorites,
  favoriteKey,
  readFavorites,
  removeFavorite,
  toggleFavorite,
} from "./favorites-storage";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  });
  clearFavorites();
});

describe("favorites-storage", () => {
  it("deduplicates by case-insensitive owner/name", () => {
    addFavorite("LangChain-AI", "LangGraph");
    const firstSavedAt = readFavorites()[0]?.savedAt;
    addFavorite("langchain-ai", "langgraph");
    expect(readFavorites()).toHaveLength(1);
    expect(readFavorites()[0]?.savedAt).not.toBe(firstSavedAt);
  });

  it("rejects empty owner or name", () => {
    const result = addFavorite(" ", "repo");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_id");
    expect(readFavorites()).toHaveLength(0);
  });

  it("toggles add and remove", () => {
    toggleFavorite("oven-sh", "bun");
    expect(readFavorites()).toHaveLength(1);
    toggleFavorite("oven-sh", "bun");
    expect(readFavorites()).toHaveLength(0);
  });

  it("enforces 200 item cap", () => {
    for (let i = 0; i < 200; i++) {
      addFavorite(`owner-${i}`, `repo-${i}`);
    }
    const blocked = addFavorite("extra", "repo");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("limit_reached");
    expect(readFavorites()).toHaveLength(200);
  });

  it("normalizes favorite key", () => {
    expect(favoriteKey("  Foo ", " Bar ")).toBe("foo/bar");
  });

  it("removeFavorite drops entry", () => {
    addFavorite("a", "b");
    removeFavorite("a", "b");
    expect(readFavorites()).toHaveLength(0);
  });
});
