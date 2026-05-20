import { describe, expect, it } from "vitest";
import { resolveBaselineStars } from "./period-star-delta";

const DAILY = [
  { date: "2025-01-01", stargazers: 100 },
  { date: "2025-06-01", stargazers: 400 },
  { date: "2025-12-31", stargazers: 500 },
];

describe("resolveBaselineStars", () => {
  it("uses snapshot baseline for today", () => {
    expect(resolveBaselineStars("today", 80, DAILY)).toBe(80);
  });

  it("uses daily history for week when available", () => {
    const baseline = resolveBaselineStars("week", 999, DAILY);
    expect(baseline).not.toBe(999);
    expect(baseline).toBeGreaterThan(0);
  });

  it("falls back to snapshot baseline when daily history is empty", () => {
    expect(resolveBaselineStars("month", 250, [])).toBe(250);
  });
});
