import type { Database } from "@github-trending/db";
import { fetchPostByGithubUrl } from "./posts";
import { githubRepoCanonicalUrl } from "./github-url";
import { linkPostFromGithub, upsertProductHuntPost } from "./linking";

export interface BackfillRepoRef {
  owner: string;
  name: string;
}

export async function backfillPostsByGithubUrl(
  db: Database,
  repos: BackfillRepoRef[],
  logger?: { warn: (msg: string, meta?: Record<string, unknown>) => void },
): Promise<{ linked: number; errors: number }> {
  let linked = 0;
  let errors = 0;

  for (const repo of repos) {
    const url = githubRepoCanonicalUrl(repo.owner, repo.name);
    try {
      const post = await fetchPostByGithubUrl(url, logger);
      if (!post) continue;
      const link = await linkPostFromGithub(
        db,
        { owner: repo.owner.toLowerCase(), name: repo.name.toLowerCase() },
        "url_query",
        url,
      );
      await upsertProductHuntPost(db, post, link);
      if (link.repoId) linked += 1;
    } catch {
      errors += 1;
    }
  }

  return { linked, errors };
}
