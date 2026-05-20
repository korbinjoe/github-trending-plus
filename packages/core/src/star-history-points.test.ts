import { describe, expect, it } from "vitest";
import { pickStarsAtOrBefore } from "./star-history-points";

const SAMPLE = [
  { date: "2025-01-01", stargazers: 100 },
  { date: "2025-01-15", stargazers: 150 },
  { date: "2025-02-01", stargazers: 200 },
];

describe("pickStarsAtOrBefore", () => {
  it("returns last row on or before target date", () => {
    expect(pickStarsAtOrBefore(SAMPLE, "2025-01-10")).toBe(100);
    expect(pickStarsAtOrBefore(SAMPLE, "2025-01-15")).toBe(150);
    expect(pickStarsAtOrBefore(SAMPLE, "2025-01-20")).toBe(150);
    expect(pickStarsAtOrBefore(SAMPLE, "2025-03-01")).toBe(200);
  });

  it("returns null when target is before first row", () => {
    expect(pickStarsAtOrBefore(SAMPLE, "2024-12-01")).toBeNull();
  });

  it("handles empty history", () => {
    expect(pickStarsAtOrBefore([], "2025-01-01")).toBeNull();
  });
});
