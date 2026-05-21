# Release checklist (maintainers)

Complete before switching the repository to **Public**.

## Pre-flight

- [x] `gitleaks detect --config .gitleaks.toml` — see [SECRET_AUDIT.md](./SECRET_AUDIT.md)
- [ ] `pnpm lint && pnpm typecheck && pnpm test` all green
- [x] Internal `research/` and `openspec/` removed from git history (keep locally if needed)
- [x] Root `README.md`, `LICENSE`, community files present
- [x] Root `package.json` has `"license": "MIT"` (no `"private": true`)

## GitHub settings

- [ ] Settings → General → Change visibility → **Public**
- [ ] Enable **Issues** (optional **Discussions**)
- [ ] Settings → Security → enable **Secret scanning** and **Push protection** (if available)
- [ ] Settings → Branches → protect `main`, require **CI** check

## Secrets

- [ ] Rotate `GITHUB_TOKEN`, `CRON_SECRET`, `PRODUCTHUNT_*` if they ever appeared in logs or forks
- [ ] Confirm Vercel env vars are Production-only, not in git

## Tag v0.1.0 (example release notes)

```markdown
## GitHub Trending+ v0.1.0

MVP open-source release.

**Includes**
- Velocity & Early Signal rankings
- GitHub GraphQL ingest + optional OSS Insight / Product Hunt
- Next.js 15 web app, RSS, fuzzy search, local favorites
- Self-host: Docker Postgres + docs/SELF_HOSTING.md

**Known limits**
- In-memory API rate limit (not global across serverless instances)
- Ingest coverage = configured languages/topics, not all of GitHub
- Requires operator-provided GitHub PAT

**Setup:** see README.md and .env.example
```

```bash
git tag -a v0.1.0 -m "v0.1.0 — open-source MVP"
git push origin v0.1.0
```

## Post-launch (24h)

- [ ] Run ingest cron; watch for GitHub `rate_limit` logs
- [ ] Execute [OSS_PROMOTION.md](./OSS_PROMOTION.md) Phase 0 items
- [ ] Monitor Security tab for Dependabot / secret alerts
