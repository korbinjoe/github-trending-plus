# Production deployment guide

How to deploy **GitHub Trending+** to production. Recommended stack: **Vercel (app + Cron) + Neon/Supabase (Postgres)** — viable on free tiers for MVP.

## Architecture overview

```
┌─────────────┐     Cron (scheduled)   ┌──────────────────────────┐
│   Vercel    │ ─────────────────────► │ POST /api/cron/ingest     │
│  Next.js 15 │                        │  → packages/github ingest │
│  ISR + API  │ ◄───────────────────── │  → Postgres rankings      │
└──────┬──────┘                        └────────────┬─────────────┘
       │                                            │
       │  DATABASE_URL                              │
       └───────────────────────────────────────────►│ Neon / Supabase │
                                                    └─────────────────┘
       GITHUB_TOKEN ──► GitHub GraphQL API (server-side only)
```

| Component | Production choice | Notes |
|-----------|-------------------|-------|
| App hosting | [Vercel](https://vercel.com) Hobby | Next.js 15 App Router, ISR, Cron Jobs |
| Database | [Neon](https://neon.tech) or [Supabase](https://supabase.com) free tier | Postgres 16+ |
| Domain | `*.vercel.app` or custom CNAME | Must match `NEXT_PUBLIC_SITE_URL` |
| Secrets | Vercel Environment Variables | Never commit; never expose to the browser |

---

## Prerequisites

- GitHub repo **Admin** access (to connect Vercel)
- Node.js **20+**, pnpm **9+** (for local migrations and first ingest)
- GitHub **Personal Access Token (PAT)** with at least `public_repo` (or fine-grained read equivalent)
- Neon or Supabase project created

---

## 1. Prepare Postgres

### 1.1 Create the database

**Neon (recommended)**

1. Create a Project → pick a region close to users (e.g. `aws-ap-southeast-1`)
2. Copy the **connection string** (enable *Pooled connection* for serverless)
3. Example: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

**Supabase**

1. Project Settings → Database → Connection string (URI)
2. Prefer the **transaction pooler** string in production (port 6543)

### 1.2 Initialize schema

Run **locally** (any machine that can reach the DB):

```bash
# After cloning the repo
cp .env.example .env
# Set DATABASE_URL to your production connection string

pnpm install
pnpm db:push
```

`pnpm db:push` syncs the Drizzle schema from `packages/db` to Postgres (no separate migration files).

> **Note:** `db:push` mutates the target database. Run before first production deploy; for later schema changes, use a maintenance window and backup first.

### 1.3 Fuzzy search (`pg_trgm`)

Keyword fuzzy search needs the Postgres `pg_trgm` extension and GIN indexes. After `db:push`:

```bash
pnpm db:trgm
```

This runs `packages/db/scripts/pg_trgm_search.sql` (`CREATE EXTENSION` + trigram indexes).

**Production notes:**

- Neon / Supabase usually ship `pg_trgm`; if `CREATE EXTENSION` fails, enable it in the console or ask your DBA, then rerun `pnpm db:trgm`.
- The DB user needs `CREATE EXTENSION` (Neon primary role typically can).
- Optional `SEARCH_FUZZY_THRESHOLD` (default `0.25`) — see `.env.example`.

---

## 2. Prepare GitHub token

1. GitHub → Settings → Developer settings → Personal access tokens
2. Create a classic PAT or fine-grained token with **GraphQL API** read access to public repos
3. Store the token in a password manager; configure **only** as Vercel env `GITHUB_TOKEN`

Rate limits: ingest polls candidates per language; on `403/429`, logs include `rate_limit` and the job skips that language and continues.

---

## 3. Deploy to Vercel

### 3.1 Import project

1. [Vercel Dashboard](https://vercel.com/new) → Import Git Repository
2. Select this monorepo
3. **Root Directory:** `apps/web`
4. Framework preset: **Next.js** (auto-detected)
5. If the monorepo is not detected, enable **Include source files outside of the Root Directory** (pnpm workspace uses `packages/*`)

### 3.2 Build settings

| Setting | Recommended |
|---------|-------------|
| Install Command | `cd ../.. && pnpm install` or leave empty for Vercel auto-detect |
| Build Command | `cd ../.. && pnpm --filter @github-trending/web build` |
| Output Directory | Default (Next.js) |
| Node.js Version | 20.x |

You can also keep root directory empty and use `pnpm --filter @github-trending/web build` — follow what the Vercel import wizard detects.

### 3.3 Environment variables

Vercel → Project → Settings → Environment Variables (**Production** and **Preview** as needed):

| Variable | Required | Description |
|----------|:--------:|-------------|
| `DATABASE_URL` | ✅ | Postgres URL (Neon pooled URL preferred) |
| `GITHUB_TOKEN` | ✅ | GitHub PAT, server-only |
| `CRON_SECRET` | ✅ | Long random string (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Full production URL, e.g. `https://your-domain.com` (no trailing slash) |
| `PRODUCTHUNT_API_KEY` | Optional | PH OAuth app key (pair with `PRODUCTHUNT_API_SECRET`) |
| `PRODUCTHUNT_API_SECRET` | Optional | PH OAuth app secret |
| `PRODUCTHUNT_DEVELOPER_TOKEN` | Optional | PH developer token (overrides key/secret if set) |
| `PH_INGEST_LOOKBACK_DAYS` | Optional | Default `7` |
| `PH_INGEST_TOPICS` | Optional | Default `developer-tools,open-source` |
| `PH_INGEST_PAGE_SIZE` | Optional | Default `50` |

Same list in `.env.example` and `apps/web/README.md`.

If no `PRODUCTHUNT_*` vars are set, `/api/cron/ph-ingest` returns `{ skipped: true }` and the UI hides PH badges.

### 3.4 Cron schedules

Defined in `apps/web/vercel.json`:

| Schedule | Path | Purpose |
|----------|------|---------|
| `0 8 * * *` | `/api/cron/ingest?ranking=true` | Daily 08:00 UTC: snapshots, ranking batch, RSS refresh |
| `0 9 * * *` | `/api/cron/ph-ingest` | Daily 09:00 UTC: Product Hunt ingest + repo linking |

> **Vercel Hobby:** Each cron expression runs at most once per day; high-frequency schedules like `*/6` need Pro. Extra ingests: manual `curl` or local `pnpm ingest:once`.

**Auth:** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set in env.

**HTTP method:** Vercel Cron uses **GET**; `/api/cron/ingest` also accepts **POST** (same handler). Manual triggers can use either.

**Function timeout:** Routes set `maxDuration = 300` (5 min). Vercel **Hobby** serverless max is ~**60s**. If ingest times out:

- Run `pnpm ingest:once` locally against production `DATABASE_URL`;
- Upgrade to Pro for longer runs;
- Or reduce `INGEST_LANGUAGES` / candidate limits in `packages/github` (code change).

### 3.5 Deploy

Connect the `main` branch; pushes to `main` deploy. You can also **Redeploy** from the Vercel dashboard.

CI (`.github/workflows/ci.yml`) runs `typecheck`, `lint`, `test` on PR/push — it does **not** deploy; Vercel Git integration handles deployment.

---

## 4. One-time historical star daily backfill (recommended)

If `repositories` is populated but `week` / `month` / `halfYear` / `year` rankings are empty, run a **one-time** backfill from [OSS Insight](https://ossinsight.io/docs/api/stargazers-history) (~400 days of daily stars per repo) into `repo_star_daily`, then recompute all periods. Daily ingest still appends `repository_snapshots` and upserts **today** in `repo_star_daily` (`source=github`) without overwriting OSS history.

```bash
# Local; DATABASE_URL points at target DB (GITHUB_TOKEN not required)
# Ensure schema includes repo_star_daily: pnpm db:push

# Full daily series + all-period rankings (recommended)
pnpm backfill:star-daily:ranking

# Daily series only, no ranking recompute
pnpm backfill:star-daily

# Trial: first 10 repos
pnpm --filter @github-trending/github backfill:star-daily --limit 10 --ranking

# Force overwrite existing series (use with care)
pnpm --filter @github-trending/github backfill:star-daily --force --ranking
```

**Notes:**

- OSS Insight public API ~**600 requests/hour/IP**; default 6.2s spacing. ~2500 repos ≈ **4–5 hours** — run on a stable connection.
- Repos with ~365 days of coverage are skipped (`--force` to rerun).
- After backfill, daily cron with `ranking=true` maintains rankings; **no need** to repeat full star-daily backfill.
- **New repos:** after first appearing in `repositories`, run `backfill:star-daily` once or long-period baselines may be missing.
- Repo detail supports `?period=week|month|halfYear|year`, aligned with the home feed.

### 4.1 Legacy 4-anchor backfill (deprecated)

These wrote 7/30/180/365-day anchors to `repository_snapshots` — **use** `backfill:star-daily` instead:

```bash
pnpm backfill:ranking   # deprecated — use backfill:star-daily:ranking
pnpm backfill:once      # deprecated
```

---

## 5. First data ingest

After deploy, env, and DB are ready, run **at least one** ingest with ranking or the home page and APIs stay empty.

```bash
curl -X POST "https://YOUR_DOMAIN/api/cron/ingest?ranking=true" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or locally (`DATABASE_URL` → production):

```bash
pnpm ingest:once --ranking
```

Success JSON includes `ok: true`, `reposIngested`, `rankingRunIds`, etc.

**Product Hunt ingest** (requires `PRODUCTHUNT_*`):

```bash
curl -X POST "https://YOUR_DOMAIN/api/cron/ph-ingest" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Or locally
pnpm ph-ingest:once
```

Verify:

- Browser: `https://YOUR_DOMAIN`
- `GET https://YOUR_DOMAIN/api/feed?view=velocity&period=today`
- `GET https://YOUR_DOMAIN/feeds/all.xml`

---

## 6. Custom domain (optional)

1. Vercel → Project → Settings → Domains → add domain
2. Configure DNS (CNAME to `cname.vercel-dns.com` or A records as shown)
3. Set `NEXT_PUBLIC_SITE_URL` to `https://your-domain.com`
4. **Redeploy** so RSS and canonical URLs update

---

## 7. Operations and monitoring

### 7.1 Logs

Vercel → Project → Logs — ingest emits structured JSON:

| Message | Meaning |
|---------|---------|
| `cron_ingest_start` | Job started (`ranking` flag) |
| `cron_ingest_complete` | Success (`durationMs`, `reposIngested`, `errors`) |
| `cron_ingest_failed` | Failure (`reason`) |
| `ingest_failed` + `GITHUB_TOKEN missing` | Token not configured |

### 7.2 Failures and rollback

- If a daily ranking batch fails, the **previous** `ranking_run` keeps serving via API/RSS (see OpenSpec `deployment-ops`).
- Fix and rerun `POST .../api/cron/ingest?ranking=true`.

### 7.3 Public API rate limits

These routes: **60 requests/minute/IP** (in-memory bucket; best-effort across serverless instances):

- `GET /api/feed`
- `GET /api/repos/{owner}/{name}`
- `GET /api/compare`

Over limit → **429** with `retryAfter` (seconds).

### 7.4 Health checklist

| Check | Expected |
|-------|----------|
| Home page | 200, ranking cards visible |
| `/api/feed` | 200, non-empty `items` (after ingest) |
| `/feeds/all.xml` | `application/rss+xml` |
| Cron without token | 401 |
| Recent Vercel Cron | Logs show `cron_ingest_complete` |

---

## 8. Security checklist

- [ ] `GITHUB_TOKEN`, `CRON_SECRET`, `DATABASE_URL` only in Vercel **server** env
- [ ] No secrets in client code or `NEXT_PUBLIC_*`
- [ ] `CRON_SECRET` is strong and not committed to git
- [ ] Production `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] Rotate GitHub token periodically
- [ ] `/about` keeps unofficial disclaimer

---

## 9. Environment matrix

| Item | Local dev | Production |
|------|-----------|------------|
| Database | `docker compose up -d` (`localhost:5432`) | Neon / Supabase |
| App | `pnpm dev` → `http://localhost:3000` | Vercel |
| Ingest | `pnpm ingest:once [--ranking]` | Cron or `curl POST /api/cron/ingest` |
| Env file | Root `.env` | Vercel Environment Variables |

Local quick start: `apps/web/README.md` and [SELF_HOSTING.md](./SELF_HOSTING.md).

---

## 10. FAQ

### Q: Empty page / no repos after deploy

First `?ranking=true` ingest not run, or wrong `DATABASE_URL`. See §5.

### Q: week/month/year rankings empty

Run one-time backfill (§4) or check for 365-day anchor snapshots in `repository_snapshots`.

### Q: Cron always 401

`CRON_SECRET` missing or mismatch with `Authorization: Bearer ...`. Vercel Cron uses the same env value.

### Q: Ingest fails or times out

Check `cron_ingest_failed` in logs — common: GitHub rate limit, DB timeout, function exceeds plan limit. Remedy: `pnpm ingest:once --ranking` locally against production DB.

### Q: RSS links point to localhost

`NEXT_PUBLIC_SITE_URL` not set to production URL, or deploy not redeployed after change.

### Q: How to update database schema

```bash
# DATABASE_URL points at target DB
pnpm db:push
```

Backup in Neon/Supabase console before major changes.

---

## 11. Related files

| File | Purpose |
|------|---------|
| `.env.example` | Env template |
| `apps/web/vercel.json` | Cron schedules |
| `apps/web/src/app/api/cron/ingest/route.ts` | Ingest HTTP entry |
| `docker-compose.yml` | Local Postgres |
| `docs/ARCHITECTURE.md` | Monorepo layout |

---

## Appendix: quick check script (optional)

```bash
DOMAIN="https://your-domain.com"
SECRET="your-cron-secret"

# Health: feed
curl -sf "$DOMAIN/api/feed?view=velocity&period=today" | head -c 200

# Trigger ingest (use sparingly in production)
curl -X POST "$DOMAIN/api/cron/ingest?ranking=true" \
  -H "Authorization: Bearer $SECRET"
```

Replace `DOMAIN` and `SECRET` before running.
