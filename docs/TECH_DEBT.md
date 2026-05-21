# Technical debt tracker

Non-blocking items tracked for post-launch issues.

## P2 — Split `globals.css`

- **File:** `apps/web/src/app/globals.css` (~1800 lines)
- **Action:** Split into feature CSS modules (`feed`, `repo-detail`, etc.); `repo-detail.css` already exists as partial split.
- **Issue title:** `refactor(web): split globals.css into feature modules`

## P1 — Global API rate limit on serverless

- **Current:** In-memory `Map` per instance (`apps/web/src/lib/rate-limit.ts`), 60 req/min/IP.
- **Limitation:** Vercel multi-instance → not a global cap; documented in README and SELF_HOSTING.
- **Options:** Vercel KV / Upstash Redis, or edge middleware with shared store.
- **Issue title:** `feat(web): distributed rate limiting for public APIs`

## P2 — Dependabot + audit

- Dependabot configured in `.github/dependabot.yml`
- Run `pnpm audit` against the public npm registry in CI when registry supports it
