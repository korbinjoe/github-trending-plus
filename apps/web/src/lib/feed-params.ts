import {
  FeedPeriodSchema,
  FeedViewSchema,
  type FeedPeriod,
  type FeedView,
} from "@github-trending/core/types";

export type FeedSearchParams = Record<
  string,
  string | string[] | undefined
>;

export interface ParsedFeedParams {
  view: FeedView;
  period: FeedPeriod;
  lang?: string;
  topic?: string;
  cursor?: string;
  includeNoise: boolean;
}

export function parseFeedParams(
  searchParams: FeedSearchParams,
): ParsedFeedParams {
  const viewRaw = pickString(searchParams.view) ?? "velocity";
  const periodRaw = pickString(searchParams.period) ?? "today";
  const hideShellsRaw = pickString(searchParams.hideShells);

  const view = FeedViewSchema.parse(viewRaw);
  const period = FeedPeriodSchema.parse(periodRaw);
  const hideShells = hideShellsRaw !== "false";

  return {
    view,
    period,
    lang: pickString(searchParams.lang) || undefined,
    topic: pickString(searchParams.topic) || undefined,
    cursor: pickString(searchParams.cursor) || undefined,
    includeNoise: !hideShells,
  };
}

function pickString(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
