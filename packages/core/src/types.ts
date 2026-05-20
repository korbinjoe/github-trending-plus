import { z } from "zod";

export const FeedViewSchema = z.enum(["velocity", "early"]);
export const FeedPeriodSchema = z.enum([
  "today",
  "week",
  "month",
  "halfYear",
  "year",
]);
export const HealthStatusSchema = z.enum(["active", "fair", "low"]);

export const AlternativeItemSchema = z.object({
  owner: z.string(),
  name: z.string(),
  slug: z.string(),
  why: z.string().optional(),
});

export const PhSignalSchema = z.object({
  slug: z.string(),
  phUrl: z.string(),
  votesCount: z.number().int().nonnegative(),
  featuredAt: z.string().nullable(),
  postedAt: z.string(),
  tagline: z.string().optional(),
});

export const FeedItemSchema = z.object({
  rank: z.number(),
  owner: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  deltaStars: z.number(),
  totalStars: z.number(),
  health: HealthStatusSchema,
  tags: z.array(z.string()),
  isEarlySignal: z.boolean(),
  triggers: z.array(z.string()).optional(),
  phSignal: PhSignalSchema.optional(),
  alternatives: z.array(AlternativeItemSchema).max(2),
  compareUrl: z.string().optional(),
});

export const FeedResponseSchema = z.object({
  items: z.array(FeedItemSchema),
  nextCursor: z.string().nullable(),
  rankingRunId: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const RepoAlternativeDetailSchema = z.object({
  owner: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  deltaStars: z.number(),
  totalStars: z.number(),
  health: HealthStatusSchema,
  license: z.string().nullable(),
  why: z.string(),
});

export const RepoDetailSchema = z.object({
  owner: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  deltaStars: z.number(),
  totalStars: z.number(),
  health: HealthStatusSchema,
  tags: z.array(z.string()),
  commits30d: z.number(),
  lastPush: z.string().nullable(),
  license: z.string().nullable(),
  language: z.string().nullable(),
  isEarlySignal: z.boolean(),
  phSignal: PhSignalSchema.optional(),
  alternatives: z.array(RepoAlternativeDetailSchema),
  compareUrl: z.string(),
  urls: z.object({
    github: z.string(),
    starHistory: z.string(),
    ossInsight: z.string(),
    librariesIo: z.string(),
    bestOfJs: z.string().optional(),
  }),
});

export const CompareRowSchema = z.object({
  dimension: z.string(),
  values: z.array(z.string()),
});

export const CompareResponseSchema = z.object({
  repos: z.array(
    z.object({
      owner: z.string(),
      name: z.string(),
      slug: z.string(),
    }),
  ),
  rows: z.array(CompareRowSchema),
  sort: z.enum(["health", "velocity"]),
  starHistoryUrl: z.string(),
});

export type PhSignal = z.infer<typeof PhSignalSchema>;

export type FeedView = z.infer<typeof FeedViewSchema>;
export type FeedPeriod = z.infer<typeof FeedPeriodSchema>;
export type ApiHealthStatus = z.infer<typeof HealthStatusSchema>;
export type FeedItem = z.infer<typeof FeedItemSchema>;
export type FeedResponse = z.infer<typeof FeedResponseSchema>;
export type RepoAlternativeDetail = z.infer<typeof RepoAlternativeDetailSchema>;
export type RepoDetail = z.infer<typeof RepoDetailSchema>;
export type CompareResponse = z.infer<typeof CompareResponseSchema>;

export const FavoriteSnapshotSchema = z.object({
  description: z.string().optional(),
  deltaStars: z.number().optional(),
  health: HealthStatusSchema.optional(),
});

export const FavoriteItemSchema = z.object({
  owner: z.string(),
  name: z.string(),
  savedAt: z.string(),
  snapshot: FavoriteSnapshotSchema.optional(),
});

export const FavoritesDocumentSchema = z.object({
  version: z.literal(1),
  items: z.array(FavoriteItemSchema),
});

export const FavoriteRepoRefSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
});

export const FavoritesHydrateRequestSchema = z.object({
  repos: z.array(FavoriteRepoRefSchema).min(1).max(50),
});

export const FavoriteHydrateResultSchema = z.object({
  owner: z.string(),
  name: z.string(),
  fullName: z.string(),
  found: z.boolean(),
  description: z.string().optional(),
  deltaStars: z.number().optional(),
  health: HealthStatusSchema.optional(),
  language: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export const FavoritesHydrateResponseSchema = z.object({
  items: z.array(FavoriteHydrateResultSchema),
});

export type FavoriteSnapshot = z.infer<typeof FavoriteSnapshotSchema>;
export type FavoriteItem = z.infer<typeof FavoriteItemSchema>;
export type FavoritesDocument = z.infer<typeof FavoritesDocumentSchema>;
export type FavoriteRepoRef = z.infer<typeof FavoriteRepoRefSchema>;
export type FavoriteHydrateResult = z.infer<typeof FavoriteHydrateResultSchema>;
export type FavoritesHydrateResponse = z.infer<typeof FavoritesHydrateResponseSchema>;

export const FAVORITES_STORAGE_KEY = "gtp-favorites-v1";
export const FAVORITES_MAX_ITEMS = 200;

/** Search results reuse FeedItem shape (rank = result order, alternatives empty). */
export const SearchResponseSchema = z.object({
  items: z.array(FeedItemSchema),
  nextCursor: z.string().nullable(),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const SEARCH_MIN_KEYWORD_LENGTH = 2;
export const SEARCH_DEFAULT_LIMIT = 24;
export const SEARCH_MAX_LIMIT = 48;
