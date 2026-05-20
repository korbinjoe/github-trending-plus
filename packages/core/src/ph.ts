/** Persisted Product Hunt post fields (mirrors `product_hunt_posts`). */
export interface ProductHuntPost {
  phId: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  phUrl: string;
  websiteRedirect: string | null;
  resolvedUrl: string | null;
  githubOwner: string | null;
  githubName: string | null;
  repoId: string | null;
  votesCount: number;
  commentsCount: number;
  featuredAt: string | null;
  postedAt: string;
  topics: string[];
  matchedVia: string | null;
}
