import {
  parseAsBoolean,
  parseAsString,
  parseAsStringEnum,
} from "nuqs";

/** Shallow URL updates; feed data loads via `/api/feed` in `FeedListClient`. */
const clientQuery = { shallow: true } as const;

export const feedViewParser = parseAsStringEnum([
  "velocity",
  "early",
  "ph",
] as const)
  .withDefault("velocity")
  .withOptions(clientQuery);

export const feedPhGithubParser = parseAsStringEnum(["all", "linked"] as const)
  .withDefault("all")
  .withOptions(clientQuery);

export const feedPeriodParser = parseAsStringEnum([
  "today",
  "week",
  "month",
  "halfYear",
  "year",
] as const)
  .withDefault("today")
  .withOptions(clientQuery);

export const feedLangParser = parseAsString
  .withDefault("")
  .withOptions(clientQuery);

export const feedTopicParser = parseAsString
  .withDefault("")
  .withOptions(clientQuery);

export const feedHideShellsParser = parseAsBoolean
  .withDefault(true)
  .withOptions(clientQuery);
