# Open-source promotion playbook

Zero-budget launch checklist for GitHub Trending+.

## Repository metadata (do before/just after public)

- [ ] GitHub **About** description: `Unofficial GitHub trending by velocity + commit health. Next.js, Postgres, RSS, self-host.`
- [ ] **Topics:** `github`, `trending`, `nextjs`, `postgresql`, `open-source`, `rss`, `self-hosted`
- [ ] Pin README sections: quick start, RSS `/feeds/all.xml`, ranking transparency link

## Phase 0 — Launch day

- [ ] Flip repo to **Public** ([RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md))
- [ ] Tag `v0.1.0` with MVP scope + known limits
- [ ] **Show HN** title idea: *Show HN: GitHub Trending+ – velocity ranking with transparent rules and RSS*
  - Body: problem (official trending noise), link repo + demo, link `packages/core` ranking rules
- [ ] **Reddit** `r/selfhosted` or `r/opensource` — self-host angle + docker compose
- [ ] Tweet/X or Mastodon one-liner + screenshot of feed

## Phase 1 — Week 1

- [ ] Technical post (DEV.to or Medium): *Beyond official Trending: filter noise with ΔStars + commits*
  - Include formula excerpt from `packages/core`
- [ ] Highlight RSS in README for newsletter curators
- [ ] Reply to relevant HN/GitHub discussions (no spam)

## Phase 2 — Month 1

- [ ] PR to [star-history](https://github.com/star-history/star-history) README for cross-link (evaluate fit first)
- [ ] Track KPIs in a GitHub Issue:

| Metric | Target |
|--------|--------|
| Repo stars | 100+ |
| Site UV | 500+ |
| RSS subscribers (estimate) | 50+ |
| Community mention (HN/DEV/V2EX) | ≥1 |

## Content templates

**HN / Reddit (short):**

> We built an unofficial GitHub trending site that ranks by star velocity and recent commits instead of all-time stars. Rules are in open source (`packages/core`). RSS + self-host via Docker. Not affiliated with GitHub.

**DEV / blog (outline):**

1. Pain: official trending ≠ “what’s heating up now”
2. Approach: ingest GraphQL + health filters
3. Transparency: link ranking code + About page
4. CTA: star repo, try RSS, self-host

## Differentiation bullets

- Transparent, auditable ranking weights
- Early-signal lane for repos &lt; 5k stars
- Optional Product Hunt launch context
- Multi-locale UI + RSS
