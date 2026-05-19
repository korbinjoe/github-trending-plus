import { errorResponse, jsonResponse, validateCronSecret } from "@/lib/api-utils";
import { runIngest } from "@github-trending/github";
import { revalidateTag } from "next/cache";

export const maxDuration = 300;

const ingestLogger = {
  info: (msg: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: "info", msg, ...meta }));
  },
  error: (msg: string, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: "error", msg, ...meta }));
  },
  warn: (msg: string, meta?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: "warn", msg, ...meta }));
  },
};

/** Vercel Cron invokes GET; manual triggers may use POST. */
export async function GET(request: Request) {
  return handleIngest(request);
}

export async function POST(request: Request) {
  return handleIngest(request);
}

async function handleIngest(request: Request) {
  if (!validateCronSecret(request)) {
    return errorResponse("Unauthorized", 401);
  }

  if (!process.env.GITHUB_TOKEN) {
    ingestLogger.error("ingest_failed", { reason: "GITHUB_TOKEN missing" });
    return errorResponse("GITHUB_TOKEN not configured", 500);
  }

  const { searchParams } = new URL(request.url);
  const ranking = searchParams.get("ranking") === "true";
  const started = Date.now();

  ingestLogger.info("cron_ingest_start", { ranking });

  try {
    const result = await runIngest({ ranking, logger: ingestLogger });
    revalidateTag("feed");

    ingestLogger.info("cron_ingest_complete", {
      durationMs: Date.now() - started,
      reposIngested: result.reposIngested,
      errors: result.errors,
    });

    return jsonResponse({
      ok: true,
      ...result,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    ingestLogger.error("cron_ingest_failed", {
      durationMs: Date.now() - started,
      reason: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(
      err instanceof Error ? err.message : "Ingest failed",
      500,
    );
  }
}
