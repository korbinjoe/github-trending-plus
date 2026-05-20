import { errorResponse, jsonResponse, validateCronSecret } from "@/lib/api-utils";
import { runPhIngest } from "@github-trending/producthunt";
import { revalidateTag } from "next/cache";

export const maxDuration = 300;

const phLogger = {
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

export async function GET(request: Request) {
  return handlePhIngest(request);
}

export async function POST(request: Request) {
  return handlePhIngest(request);
}

async function handlePhIngest(request: Request) {
  if (!validateCronSecret(request)) {
    return errorResponse("Unauthorized", 401);
  }

  const started = Date.now();
  phLogger.info("cron_ph_ingest_start");

  try {
    const result = await runPhIngest({ logger: phLogger });

    if (!result.skipped) {
      revalidateTag("feed");
      revalidateTag("ranking");
      revalidateTag("topics");
    }

    phLogger.info("cron_ph_ingest_complete", {
      durationMs: Date.now() - started,
      ...result,
    });

    return jsonResponse({
      ok: true,
      durationMs: Date.now() - started,
      ...result,
    });
  } catch (err) {
    phLogger.error("cron_ph_ingest_failed", {
      durationMs: Date.now() - started,
      reason: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(
      err instanceof Error ? err.message : "PH ingest failed",
      500,
    );
  }
}
