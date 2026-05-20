import { describe, expect, it } from "vitest";
import { periodBaselineDate, utcDateDaysAgo, utcToday } from "./periods";

describe("utcToday", () => {
  it("returns UTC date string", () => {
    const d = new Date("2026-05-20T15:30:00.000Z");
    expect(utcToday(d)).toBe("2026-05-20");
  });
});

describe("periodBaselineDate", () => {
  it("returns date string at period start", () => {
    const from = new Date("2026-05-20T15:30:00.000Z");
    expect(periodBaselineDate("week", from)).toBe(utcDateDaysAgo(7, from));
  });
});
