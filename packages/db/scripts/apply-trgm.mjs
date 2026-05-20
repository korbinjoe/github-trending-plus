import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/github_trending";

const sqlPath = path.resolve(__dirname, "pg_trgm_search.sql");
const migrationSql = fs.readFileSync(sqlPath, "utf8");

const sql = postgres(databaseUrl, { max: 1 });

try {
  await sql.unsafe(migrationSql);
  console.log("Applied pg_trgm search migration.");
} finally {
  await sql.end();
}
