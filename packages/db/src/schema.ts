import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const healthEnum = pgEnum("health_status", ["active", "fair", "low"]);
export const feedViewEnum = pgEnum("feed_view", ["velocity", "early"]);
export const feedPeriodEnum = pgEnum("feed_period", [
  "today",
  "week",
  "month",
  "halfYear",
  "year",
]);

export const repositories = pgTable(
  "repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    description: text("description"),
    language: text("language"),
    license: text("license"),
    topics: jsonb("topics").$type<string[]>().notNull().default([]),
    isFork: integer("is_fork").notNull().default(0),
    githubId: text("github_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("repositories_owner_name_idx").on(t.owner, t.name),
    index("repositories_language_idx").on(t.language),
  ],
);

export const repoStarDaily = pgTable(
  "repo_star_daily",
  {
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    stars: integer("stars").notNull(),
    source: text("source").notNull().default("ossinsight"),
    ingestedAt: timestamp("ingested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.repoId, t.date] }),
    index("repo_star_daily_repo_date_idx").on(t.repoId, t.date),
  ],
);

export const repositorySnapshots = pgTable(
  "repository_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(),
    forks: integer("forks").notNull().default(0),
    openIssues: integer("open_issues").notNull().default(0),
    commits30d: integer("commits_30d").notNull().default(0),
    pushedAt: timestamp("pushed_at", { withTimezone: true }),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("repository_snapshots_repo_captured_idx").on(
      t.repoId,
      t.capturedAt,
    ),
  ],
);

export const rankingRuns = pgTable(
  "ranking_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    period: feedPeriodEnum("period").notNull(),
    view: feedViewEnum("view").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: text("status").notNull().default("running"),
    reposProcessed: integer("repos_processed").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
  },
  (t) => [
    index("ranking_runs_period_view_idx").on(t.period, t.view, t.startedAt),
    index("ranking_runs_completed_lookup_idx").on(
      t.period,
      t.view,
      t.status,
      t.completedAt,
    ),
  ],
);

export const periodMetrics = pgTable(
  "period_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    rankingRunId: uuid("ranking_run_id")
      .notNull()
      .references(() => rankingRuns.id, { onDelete: "cascade" }),
    period: feedPeriodEnum("period").notNull(),
    view: feedViewEnum("view").notNull(),
    language: text("language"),
    deltaStars: integer("delta_stars").notNull().default(0),
    totalStars: integer("total_stars").notNull().default(0),
    commits30d: integer("commits_30d").notNull().default(0),
    health: healthEnum("health").notNull(),
    healthScore: real("health_score").notNull(),
    velocityRank: integer("velocity_rank"),
    isEarlySignal: integer("is_early_signal").notNull().default(0),
    relativeVelocityPercentile: real("relative_velocity_percentile"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("period_metrics_lookup_idx").on(
      t.period,
      t.view,
      t.language,
      t.velocityRank,
    ),
    index("period_metrics_ranking_run_idx").on(t.rankingRunId, t.velocityRank),
    index("period_metrics_repo_period_idx").on(t.repoId, t.period),
  ],
);

export const alternativesEdges = pgTable(
  "alternatives_edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    anchorRepoId: uuid("anchor_repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    candidateRepoId: uuid("candidate_repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    period: feedPeriodEnum("period").notNull(),
    reason: text("reason").notNull(),
    score: real("score").notNull(),
    rank: integer("rank").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("alternatives_anchor_period_idx").on(
      t.anchorRepoId,
      t.period,
      t.rank,
    ),
    uniqueIndex("alternatives_anchor_candidate_period_idx").on(
      t.anchorRepoId,
      t.candidateRepoId,
      t.period,
    ),
  ],
);

export const ingestErrors = pgTable("ingest_errors", {
  id: uuid("id").primaryKey().defaultRandom(),
  owner: text("owner"),
  name: text("name"),
  message: text("message").notNull(),
  source: text("source"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const productHuntPosts = pgTable(
  "product_hunt_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phId: text("ph_id").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline"),
    description: text("description"),
    phUrl: text("ph_url").notNull(),
    websiteRedirect: text("website_redirect"),
    resolvedUrl: text("resolved_url"),
    githubOwner: text("github_owner"),
    githubName: text("github_name"),
    repoId: uuid("repo_id").references(() => repositories.id, {
      onDelete: "set null",
    }),
    votesCount: integer("votes_count").notNull(),
    commentsCount: integer("comments_count").notNull().default(0),
    featuredAt: timestamp("featured_at", { withTimezone: true }),
    postedAt: timestamp("posted_at", { withTimezone: true }).notNull(),
    topics: jsonb("topics").$type<string[]>().notNull().default([]),
    matchedVia: text("matched_via"),
    ingestedAt: timestamp("ingested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("product_hunt_posts_ph_id_idx").on(t.phId),
    index("product_hunt_posts_repo_id_idx").on(t.repoId),
    index("product_hunt_posts_posted_at_idx").on(t.postedAt),
    index("product_hunt_posts_github_idx").on(t.githubOwner, t.githubName),
  ],
);
