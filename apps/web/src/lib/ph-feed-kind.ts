import type { PhLeaderboardRow } from "@github-trending/producthunt";

export function classifyPhEntryKind(
  row: PhLeaderboardRow,
): "repo" | "launch" | "product" {
  if (row.repoId) return "repo";
  if (row.githubOwner && row.githubName) return "launch";
  return "product";
}
