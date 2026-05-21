import {
  FeedPeriodSchema,
  FeedViewSchema,
  PhGithubFilterSchema,
  type FeedPeriod,
  type FeedView,
  type PhGithubFilter,
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
  phGithub: PhGithubFilter;
}

const DEFAULT_FEED_PERIOD: FeedPeriod = "today";
const DEFAULT_PH_FEED_PERIOD: FeedPeriod = "week";

export function defaultFeedPeriod(view: FeedView): FeedPeriod {
  return view === "ph" ? DEFAULT_PH_FEED_PERIOD : DEFAULT_FEED_PERIOD;
}

export function parseFeedPeriod(
  period: string | undefined,
  view: FeedView = "velocity",
): FeedPeriod {
  const parsed = FeedPeriodSchema.safeParse(period);
  return parsed.success ? parsed.data : defaultFeedPeriod(view);
}

export function parseFeedParams(
  searchParams: FeedSearchParams,
): ParsedFeedParams {
  const viewRaw = pickString(searchParams.view) ?? "velocity";
  const periodRaw = pickString(searchParams.period);
  const hideShellsRaw = pickString(searchParams.hideShells);

  const view = FeedViewSchema.parse(viewRaw);
  const period = parseFeedPeriod(periodRaw, view);
  const hideShells = hideShellsRaw !== "false";
  const phGithubRaw = pickString(searchParams.phGithub) ?? "all";
  const phGithub = PhGithubFilterSchema.parse(phGithubRaw);

  return {
    view,
    period,
    lang: pickString(searchParams.lang) || undefined,
    topic: pickString(searchParams.topic) || undefined,
    cursor: pickString(searchParams.cursor) || undefined,
    includeNoise: !hideShells,
    phGithub,
  };
}

function pickString(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
