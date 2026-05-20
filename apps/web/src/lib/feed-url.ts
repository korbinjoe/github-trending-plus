import type { ParsedFeedParams } from "./feed-params";

export function buildFeedQuery(
  params: ParsedFeedParams,
  nextCursor?: string,
): string {
  const q = new URLSearchParams();
  q.set("view", params.view);
  q.set("period", params.period);
  if (params.lang) q.set("lang", params.lang);
  if (params.topic) q.set("topic", params.topic);
  if (!params.includeNoise) q.set("hideShells", "false");
  if (nextCursor) q.set("cursor", nextCursor);
  const s = q.toString();
  return s ? `?${s}` : "";
}
