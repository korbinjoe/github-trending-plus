import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { runIngest } from "./ingest";

dotenv.config({
  path: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../.env",
  ),
});

const ranking = process.argv.includes("--ranking");
const rankingOnly = process.argv.includes("--ranking-only");

runIngest({ ranking, rankingOnly })
  .then((r) => {
    console.log("Ingest complete", r);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
