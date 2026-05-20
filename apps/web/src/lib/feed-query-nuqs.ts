import {
  parseAsBoolean,
  parseAsString,
  parseAsStringEnum,
} from "nuqs";

/** Home feed filters must hit the server (RSC), not client-only URL updates. */
const serverQuery = { shallow: false } as const;

export const feedViewParser = parseAsStringEnum(["velocity", "early"] as const)
  .withDefault("velocity")
  .withOptions(serverQuery);

export const feedPeriodParser = parseAsStringEnum([
  "today",
  "week",
  "month",
  "halfYear",
  "year",
] as const)
  .withDefault("today")
  .withOptions(serverQuery);

export const feedLangParser = parseAsString
  .withDefault("")
  .withOptions(serverQuery);

export const feedTopicParser = parseAsString
  .withDefault("")
  .withOptions(serverQuery);

export const feedHideShellsParser = parseAsBoolean
  .withDefault(true)
  .withOptions(serverQuery);
