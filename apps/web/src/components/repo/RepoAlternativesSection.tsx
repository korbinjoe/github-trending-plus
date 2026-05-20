import type { RepoDetail } from "@github-trending/core/types";
import { getCachedRepoAlternatives } from "@/lib/cached-repo-detail";
import { RepoAlternativesPanel } from "./RepoAlternativesPanel";

interface RepoAlternativesSectionProps {
  owner: string;
  name: string;
  period?: string;
  primary: Pick<
    RepoDetail,
    "owner" | "name" | "slug" | "description" | "deltaStars" | "health" | "license"
  >;
}

export async function RepoAlternativesSection({
  owner,
  name,
  period,
  primary,
}: RepoAlternativesSectionProps) {
  const data = await getCachedRepoAlternatives(owner, name, period);
  if (!data || data.alternatives.length === 0) return null;

  const comparePath = data.compareUrl.replace(/^https?:\/\/[^/]+/, "");

  return (
    <RepoAlternativesPanel
      primary={primary}
      alternatives={data.alternatives}
      comparePath={comparePath}
    />
  );
}
