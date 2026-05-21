# Contributing

Thanks for helping improve GitHub Trending+.

## Development setup

1. Fork and clone the repo.
2. `cp .env.example .env` and set `DATABASE_URL`, `GITHUB_TOKEN`, `CRON_SECRET`.
3. `docker compose up -d && pnpm install && pnpm db:push && pnpm db:trgm`
4. `pnpm dev` — http://localhost:3000

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm lint` | ESLint across packages |
| `pnpm typecheck` | TypeScript |
| `pnpm test` | Unit tests (integration tests need `DATABASE_URL`) |
| `pnpm ingest:once` | CLI ingest (uses `.env`) |

## Pull requests

- Keep changes focused; prefer small PRs.
- Run `pnpm lint && pnpm typecheck && pnpm test` before opening.
- Fill out the PR template (summary + test notes).
- TS: no `any`; keep files under ~500 lines when possible.

## Branch protection (maintainers)

On GitHub → Settings → Branches → protect `main`:

- Require status check **CI** before merge.
- Require PR reviews optional for solo maintainers.

## Code of conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
