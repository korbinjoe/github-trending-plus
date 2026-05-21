import { unstable_cache } from "next/cache";
import { getRepoReadmeMarkdown } from "./readme-preview";

function readmeCacheKey(owner: string, name: string): string[] {
  return ["repo-readme", owner.toLowerCase(), name.toLowerCase()];
}

export function getCachedRepoReadmeMarkdown(
  owner: string,
  name: string,
): Promise<string | null> {
  return unstable_cache(
    () => getRepoReadmeMarkdown(owner, name),
    readmeCacheKey(owner, name),
    { revalidate: 86_400, tags: ["repo-readme"] },
  )();
}
