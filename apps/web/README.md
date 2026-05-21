# GitHub Trending+ Web App

Next.js 15 App Router frontend and API for velocity-ranked GitHub repositories.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (local Postgres)

## Local setup

```bash
# From repo root
docker compose up -d
cp .env.example .env
# Set GITHUB_TOKEN and CRON_SECRET in .env

pnpm install
pnpm db:push
pnpm ingest:once --ranking   # requires GITHUB_TOKEN
pnpm dev
```

Open http://localhost:3000

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres connection string |
| `GITHUB_TOKEN` | Ingest only | GitHub PAT (server-side) |
| `CRON_SECRET` | Cron | Bearer token for `/api/cron/ingest` |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public URL for RSS/canonical links |

## Deploy (Vercel + Neon)

Full steps: [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md).

1. Create a [Neon](https://neon.tech) or Supabase free Postgres database.
2. Import the repo in Vercel; set root directory to repo root (monorepo).
3. Add environment variables from the table above.
4. `vercel.json` configures a daily cron (Vercel Hobby allows at most once per day):
   - 08:00 UTC: ingest + ranking batch (`?ranking=true`)
5. After first deploy, trigger ingest manually:

```bash
curl -X POST "https://YOUR_DOMAIN/api/cron/ingest?ranking=true" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Scripts

- `pnpm dev` — start Next.js dev server
- `pnpm build` — production build (all packages)
- `pnpm db:push` — apply Drizzle schema to Postgres
- `pnpm ingest:once` — one-off GitHub ingest from `packages/github`

## API routes

- `GET /api/feed` — ranked feed (rate limited 60/min/IP). Query: `view=velocity|early|ph`, `period`, `lang`, `topic`, `hideShells` / `includeNoise`, `phGithub=all|linked` (PH view only), `cursor`
- `GET /api/repos/{owner}/{name}` — repository detail
- `GET /api/compare?repos=` — comparison matrix
- `POST /api/cron/ingest` — secured ingest (Bearer `CRON_SECRET`)
- `GET /feeds/all.xml` — RSS

## Monitoring

Cron logs JSON lines to Vercel function logs (`cron_ingest_start`, `cron_ingest_complete`, `cron_ingest_failed`). Failed daily batches keep serving the previous `ranking_run`.
