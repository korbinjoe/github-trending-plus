import type { Database } from "@github-trending/db";
import { getDb, ingestErrors } from "@github-trending/db";
import { hasProductHuntCredentials } from "./auth";
import {
  getIngestTopics,
  getLookbackDays,
  getPageSize,
  MAX_REDIRECT_RESOLVES_PER_BATCH,
  postedAfterDate,
} from "./config";
import { fetchAllRecentPosts } from "./posts";
import { resolvePostGithubLink, upsertProductHuntPost } from "./linking";

export interface PhIngestLogger {
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
}

export const defaultPhIngestLogger: PhIngestLogger = {
  info: (msg, meta) => console.log(JSON.stringify({ level: "info", msg, ...meta })),
  warn: (msg, meta) => console.warn(JSON.stringify({ level: "warn", msg, ...meta })),
  error: (msg, meta) => console.error(JSON.stringify({ level: "error", msg, ...meta })),
};

export interface PhIngestResult {
  skipped: boolean;
  postsUpserted: number;
  linkedCount: number;
  errors: number;
}

async function logPhError(
  db: Database,
  message: string,
  slug?: string,
): Promise<void> {
  const [owner, name] = slug?.split("/") ?? [null, null];
  await db.insert(ingestErrors).values({
    owner: owner ?? null,
    name: name ?? null,
    message,
    source: "producthunt",
  });
}

export async function runPhIngest(options?: {
  logger?: PhIngestLogger;
  db?: Database;
}): Promise<PhIngestResult> {
  const logger = options?.logger ?? defaultPhIngestLogger;
  const db = options?.db ?? getDb();

  if (!hasProductHuntCredentials()) {
    logger.info("ph_ingest_skipped", { reason: "no_credentials" });
    return { skipped: true, postsUpserted: 0, linkedCount: 0, errors: 0 };
  }

  const lookbackDays = getLookbackDays();
  const pageSize = getPageSize();
  const topics = getIngestTopics();
  const postedAfter = postedAfterDate(lookbackDays);

  let postsUpserted = 0;
  let linkedCount = 0;
  let errors = 0;
  let redirectResolves = 0;

  logger.info("ph_ingest_start", { lookbackDays, topics, pageSize });

  const topicBatches = topics.length > 0 ? topics : [undefined];

  for (const topic of topicBatches) {
    try {
      const posts = await fetchAllRecentPosts(
        { postedAfter, topic, first: pageSize },
        logger,
      );

      logger.info("ph_ingest_topic_fetched", {
        topic: topic ?? "all",
        count: posts.length,
      });

      for (const post of posts) {
        try {
          const skipRedirect =
            Boolean(post.website) &&
            redirectResolves >= MAX_REDIRECT_RESOLVES_PER_BATCH;
          const link = await resolvePostGithubLink(db, post, { skipRedirect });

          if (post.website && !skipRedirect) {
            redirectResolves += 1;
          }

          await upsertProductHuntPost(db, post, link);
          postsUpserted += 1;
          if (link.repoId) linkedCount += 1;
        } catch (err) {
          errors += 1;
          const msg = err instanceof Error ? err.message : String(err);
          await logPhError(db, msg, post.slug);
          logger.error("ph_post_failed", { slug: post.slug, reason: msg });
        }
      }
    } catch (err) {
      errors += 1;
      const msg = err instanceof Error ? err.message : String(err);
      await logPhError(db, msg, topic);
      logger.error("ph_topic_batch_failed", { topic: topic ?? "all", reason: msg });
    }
  }

  logger.info("ph_ingest_complete", {
    postsUpserted,
    linkedCount,
    errors,
  });

  return { skipped: false, postsUpserted, linkedCount, errors };
}
