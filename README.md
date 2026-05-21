# GitHub Trending+

**Unofficial** velocity-focused trending for open-source repositories — not affiliated with GitHub, Inc.

Rank repos by **Δ stars + commit health**, filter noise (Awesome lists, inactive repos), and expose transparent rules, RSS, and self-hosting.

## Features

- Velocity & Early Signal rankings with configurable period and language
- Health signals (commits, bus factor hints) and optional Product Hunt launch badges
- Fuzzy search over ingested repos (`pg_trgm`)
- RSS feeds (`/feeds/all.xml`) and multi-locale UI
- Favorites stored **only in browser localStorage** (no account, no server PII)

## Quick start

**Requirements:** Node.js 20+, pnpm 9+, Docker (for local Postgres).

```bash
git clone https://github.com/korbinzhao/github-trending-plus.git
cd github-trending-plus
cp .env.example .env
# Edit .env: GITHUB_TOKEN, CRON_SECRET, DATABASE_URL

docker compose up -d
pnpm install
pnpm db:push
pnpm db:trgm
pnpm dev
```

Open http://localhost:3000. Run a first ingest:

```bash
curl -X POST "http://localhost:3000/api/cron/ingest?ranking=true" \
  -H "Authorization: Bearer $CRON_SECRET"
```

See [docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md) for details and [apps/web/README.md](./apps/web/README.md) for API routes.

## Monorepo layout

| Package | Role |
|---------|------|
| `apps/web` | Next.js 15 UI + API routes + Cron entrypoints |
| `packages/core` | Ranking, health scoring, shared types |
| `packages/github` | GraphQL ingest, OSS Insight backfill |
| `packages/db` | Drizzle schema + Postgres client |
| `packages/producthunt` | Optional PH ingest (skips when no credentials) |

Architecture: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md) | Local / VPS self-host |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Vercel + Neon production |
| [docs/SECRET_AUDIT.md](./docs/SECRET_AUDIT.md) | Pre-release secret scan log |
| [docs/OSS_PROMOTION.md](./docs/OSS_PROMOTION.md) | Launch & growth checklist |
| [docs/RELEASE_CHECKLIST.md](./docs/RELEASE_CHECKLIST.md) | Maintainer steps before/after going public |

## Environment variables

Copy [`.env.example`](./.env.example). **Server-only** (never `NEXT_PUBLIC_*`):

- `DATABASE_URL`, `GITHUB_TOKEN`, `CRON_SECRET`
- `PRODUCTHUNT_*` (optional)
- `NEXT_PUBLIC_SITE_URL` (public canonical/RSS base URL only)

## Third-party services & compliance

You are responsible for complying with each provider’s terms when operating an instance.

| Service | Required | Notes |
|---------|----------|-------|
| [GitHub GraphQL API](https://docs.github.com/en/graphql) | Yes (ingest) | Use a PAT with **minimum read scopes** for public repos. Respect [GitHub Terms](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service). |
| [OSS Insight API](https://ossinsight.io/) | Optional (star-daily backfill) | Public API; throttled in code. Follow their usage policy. |
| [Product Hunt API](https://api.producthunt.com/v2/docs) | Optional | Ingest skips when credentials are unset (`ph_ingest_skipped`). |

**Trademark:** Do not imply endorsement by GitHub. This project is community-maintained.

Ranking formula lives in `packages/core` (see About page). License field on cards reflects **each repo’s** SPDX, not this software’s MIT license.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Security issues: [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) — Copyright (c) 2026 GitHub Trending+ Contributors.
