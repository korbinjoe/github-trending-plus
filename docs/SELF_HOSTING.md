# Self-hosting guide

Run GitHub Trending+ on your machine or VPS with Docker Postgres and Next.js.

> Production on Vercel + Neon: see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Prerequisites

- Node.js 20+, pnpm 9+
- Docker (Postgres 16)
- GitHub PAT with read access to public repositories

## 1. Database

```bash
docker compose up -d
```

Default connection (matches `.env.example`):

```text
postgresql://postgres:postgres@localhost:5432/github_trending
```

## 2. Environment

```bash
cp .env.example .env
```

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Local compose URL above |
| `GITHUB_TOKEN` | Yes | Server-only; never expose to browser |
| `CRON_SECRET` | Yes | `openssl rand -hex 32` |
| `NEXT_PUBLIC_SITE_URL` | Yes | e.g. `http://localhost:3000` (RSS canonical URLs) |
| `PRODUCTHUNT_*` | No | PH cron skips when unset |
| `SEARCH_FUZZY_THRESHOLD` | No | Default `0.25` |

## 3. Schema & search index

```bash
pnpm install
pnpm db:push
pnpm db:trgm
```

## 4. Run the app

```bash
pnpm dev
```

## 5. Cron / ingest

Trigger ingest manually (same auth as production):

```bash
export CRON_SECRET=your_secret_from_env

curl -X POST "http://localhost:3000/api/cron/ingest?ranking=true" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

Optional Product Hunt ingest (requires PH credentials in `.env`):

```bash
curl -X POST "http://localhost:3000/api/cron/ph-ingest" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

Without PH credentials, the route returns success with `skipped: true` and logs `ph_ingest_skipped`.

## 6. CLI alternatives

```bash
pnpm ingest:once
pnpm ranking:once
pnpm ph-ingest:once   # skips if no PH credentials
```

## 7. Rate limits & scaling

Public API routes use in-memory rate limiting (60 req/min/IP). On multi-instance deployments, limits are per instance — see [TECH_DEBT.md](./TECH_DEBT.md).

## Privacy

Favorites use browser `localStorage` only; the server does not store user accounts or favorite lists. See the About page in the app.

## Security checklist

- [ ] `.env` not committed
- [ ] `gitleaks detect --config .gitleaks.toml` clean
- [ ] Strong `CRON_SECRET`
- [ ] GitHub PAT minimum scopes
