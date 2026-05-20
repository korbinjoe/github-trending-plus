import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defaultPhIngestLogger, runPhIngest } from "./ingest";

dotenv.config({
  path: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../.env",
  ),
});

runPhIngest({ logger: defaultPhIngestLogger })
  .then((r) => {
    console.log("PH ingest complete", r);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
