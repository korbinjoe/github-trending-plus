import type { Database } from "@github-trending/db";
import { productHuntPosts, repositories } from "@github-trending/db";
import { and, eq, sql } from "drizzle-orm";
import type { PhPostNode } from "./posts";
import {
  extractGithubFromText,
  githubRepoCanonicalUrl,
  type GithubRepoSlug,
} from "./github-url";
import { resolveGithubFromWebsite } from "./redirect";

export type MatchedVia = "redirect" | "description" | "url_query";

export interface LinkResult {
  githubOwner: string | null;
  githubName: string | null;
  repoId: string | null;
  matchedVia: MatchedVia | null;
  resolvedUrl: string | null;
}

export async function findRepositoryId(
  db: Database,
  slug: GithubRepoSlug,
): Promise<string | null> {
  const rows = await db
    .select({ id: repositories.id })
    .from(repositories)
    .where(
      sql`lower(${repositories.owner}) = ${slug.owner} and lower(${repositories.name}) = ${slug.name}`,
    )
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function linkPostFromGithub(
  db: Database,
  slug: GithubRepoSlug,
  via: MatchedVia,
  resolvedUrl: string | null,
): Promise<LinkResult> {
  const repoId = await findRepositoryId(db, slug);
  return {
    githubOwner: slug.owner,
    githubName: slug.name,
    repoId,
    matchedVia: via,
    resolvedUrl,
  };
}

export async function resolvePostGithubLink(
  db: Database,
  post: PhPostNode,
  options?: { skipRedirect?: boolean },
): Promise<LinkResult> {
  if (!options?.skipRedirect) {
    const fromWebsite = await resolveGithubFromWebsite(post.website);
    if (fromWebsite) {
      return linkPostFromGithub(
        db,
        { owner: fromWebsite.owner, name: fromWebsite.name },
        "redirect",
        fromWebsite.url,
      );
    }
  }

  const fromText =
    extractGithubFromText(post.description) ??
    extractGithubFromText(post.tagline);
  if (fromText) {
    return linkPostFromGithub(
      db,
      fromText,
      "description",
      githubRepoCanonicalUrl(fromText.owner, fromText.name),
    );
  }

  return {
    githubOwner: null,
    githubName: null,
    repoId: null,
    matchedVia: null,
    resolvedUrl: null,
  };
}

export async function upsertProductHuntPost(
  db: Database,
  post: PhPostNode,
  link: LinkResult,
): Promise<void> {
  const now = new Date();
  const topics = post.topics.map((t) => t.slug);
  const postedAt = new Date(post.createdAt);
  const featuredAt = post.featuredAt ? new Date(post.featuredAt) : null;

  const values = {
    phId: post.id,
    slug: post.slug,
    name: post.name,
    tagline: post.tagline,
    description: post.description,
    phUrl: post.url,
    websiteRedirect: post.website,
    resolvedUrl: link.resolvedUrl,
    githubOwner: link.githubOwner,
    githubName: link.githubName,
    repoId: link.repoId,
    votesCount: post.votesCount,
    commentsCount: post.commentsCount,
    featuredAt,
    postedAt,
    topics,
    matchedVia: link.matchedVia,
    updatedAt: now,
  };

  await db
    .insert(productHuntPosts)
    .values({ ...values, ingestedAt: now })
    .onConflictDoUpdate({
      target: productHuntPosts.phId,
      set: values,
    });
}

export async function relinkPostsForRepository(
  db: Database,
  repoId: string,
  owner: string,
  name: string,
): Promise<number> {
  const slug = { owner: owner.toLowerCase(), name: name.toLowerCase() };
  const updated = await db
    .update(productHuntPosts)
    .set({
      repoId,
      githubOwner: slug.owner,
      githubName: slug.name,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(productHuntPosts.githubOwner, slug.owner),
        eq(productHuntPosts.githubName, slug.name),
      ),
    )
    .returning({ id: productHuntPosts.id });
  return updated.length;
}
