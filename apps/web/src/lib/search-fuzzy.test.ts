import { describe, expect, it, afterEach } from "vitest";
import {
  DEFAULT_SEARCH_FUZZY_THRESHOLD,
  getSearchFuzzyThreshold,
  buildKeywordMatchCondition,
  buildKeywordRelevanceSql,
} from "./search-fuzzy";

describe("search-fuzzy", () => {
  const prev = process.env.SEARCH_FUZZY_THRESHOLD;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.SEARCH_FUZZY_THRESHOLD;
    } else {
      process.env.SEARCH_FUZZY_THRESHOLD = prev;
    }
  });

  it("uses default threshold when env unset", () => {
    delete process.env.SEARCH_FUZZY_THRESHOLD;
    expect(getSearchFuzzyThreshold()).toBe(DEFAULT_SEARCH_FUZZY_THRESHOLD);
  });

  it("reads valid threshold from env", () => {
    process.env.SEARCH_FUZZY_THRESHOLD = "0.4";
    expect(getSearchFuzzyThreshold()).toBe(0.4);
  });

  it("falls back on invalid threshold", () => {
    process.env.SEARCH_FUZZY_THRESHOLD = "not-a-number";
    expect(getSearchFuzzyThreshold()).toBe(DEFAULT_SEARCH_FUZZY_THRESHOLD);
  });

  it("buildKeywordMatchCondition returns a SQL object", () => {
    const cond = buildKeywordMatchCondition("vectro", 0.25);
    expect(cond).toBeDefined();
    expect(typeof cond).toBe("object");
  });

  it("buildKeywordRelevanceSql returns a SQL object", () => {
    const rel = buildKeywordRelevanceSql("agent", 0.25);
    expect(rel).toBeDefined();
    expect(typeof rel).toBe("object");
  });
});
