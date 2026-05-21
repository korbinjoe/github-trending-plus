import { describe, expect, it } from "vitest";
import { defaultFeedPeriod, parseFeedParams } from "./feed-params";

describe("parseFeedParams", () => {
  it("defaults PH view to week when period is omitted", () => {
    const params = parseFeedParams({ view: "ph" });
    expect(params.period).toBe("week");
    expect(params.view).toBe("ph");
  });

  it("defaults velocity view to today when period is omitted", () => {
    const params = parseFeedParams({});
    expect(params.period).toBe("today");
  });

  it("respects explicit period for PH view", () => {
    const params = parseFeedParams({ view: "ph", period: "month" });
    expect(params.period).toBe("month");
  });
});

describe("defaultFeedPeriod", () => {
  it("uses week for ph and today otherwise", () => {
    expect(defaultFeedPeriod("ph")).toBe("week");
    expect(defaultFeedPeriod("velocity")).toBe("today");
  });
});
