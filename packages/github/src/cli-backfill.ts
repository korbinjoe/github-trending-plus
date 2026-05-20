import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defaultIngestLogger } from "./ingest-logger";
import { runSnapshotBackfill } from "./backfill-snapshots";

dotenv.config({
  path: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../.env",
  ),
});

function parseLimit(): number | undefined {
  const idx = process.argv.indexOf("--limit");
  if (idx === -1 || !process.argv[idx + 1]) return undefined;
  const n = Number.parseInt(process.argv[idx + 1] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseDelayMs(): number | undefined {
  const idx = process.argv.indexOf("--delay-ms");
  if (idx === -1 || !process.argv[idx + 1]) return undefined;
  const n = Number.parseInt(process.argv[idx + 1] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const force = process.argv.includes("--force");
const ranking = process.argv.includes("--ranking");

runSnapshotBackfill({
  logger: defaultIngestLogger,
  force,
  ranking,
  limit: parseLimit(),
  requestDelayMs: parseDelayMs(),
})
  .then((r) => {
    console.log("Backfill complete", r);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
