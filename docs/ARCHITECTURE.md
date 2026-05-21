# Architecture

pnpm monorepo for an unofficial GitHub trending aggregator.

```
apps/web          Next.js 15 App Router, UI, /api/*, /api/cron/*
packages/core     Pure ranking & health logic (testable)
packages/github   GraphQL ingest, OSS Insight client, CLI scripts
packages/db       Drizzle schema, migrations push, pg_trgm helper
packages/producthunt  Optional PH GraphQL ingest
```

## Data flow

1. **Ingest** (`/api/cron/ingest` or CLI) — GitHub GraphQL → `repos`, snapshots, commits.
2. **Ranking** — `@github-trending/core` computes velocity / early signal → `ranking_run` rows.
3. **Serve** — ISR pages + JSON APIs read Postgres; RSS uses `NEXT_PUBLIC_SITE_URL`.
4. **Optional PH** — `/api/cron/ph-ingest` links launches to indexed repos; skips without credentials.
5. **Backfill** — OSS Insight star-daily (throttled); optional CLI jobs.

## Boundaries

| Layer | Responsibility |
|-------|----------------|
| `core` | No I/O; formulas and types |
| `github` / `producthunt` | External APIs, retries, rate limits |
| `db` | Schema + connection only |
| `web` | HTTP, auth (`CRON_SECRET`), rate limit, i18n |

## Key env vars

Server-only: `DATABASE_URL`, `GITHUB_TOKEN`, `CRON_SECRET`, `PRODUCTHUNT_*`.  
Public: `NEXT_PUBLIC_SITE_URL` only.

## Cron security

Cron routes require `Authorization: Bearer <CRON_SECRET>`. Vercel Cron injects this header when `CRON_SECRET` is set in project env.

## Related docs

- [SELF_HOSTING.md](./SELF_HOSTING.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [TECH_DEBT.md](./TECH_DEBT.md)
