# Security policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `main` | ✅ Active development |
| Older tags | Best-effort |

## Reporting a vulnerability

**Please do not open public issues for security bugs.**

1. Use [GitHub Security Advisories](https://github.com/korbinzhao/github-trending-plus/security/advisories/new) (preferred), or
2. Email the maintainer via GitHub profile contact (no public disclosure until fixed).

Include: description, reproduction steps, impact, and suggested fix if any.

We aim to acknowledge within **7 days** and ship a fix or mitigation when confirmed.

## Scope

In scope:

- Authentication bypass on `/api/cron/*`
- Secret exposure in client bundles or logs
- SQL injection / unsafe DB access
- Rate-limit bypass leading to resource exhaustion on hosted instances

Out of scope:

- Denial of service against third-party APIs (GitHub, Product Hunt)
- Issues in dependencies without a practical exploit path (report via Dependabot)

## Secret handling

Never commit `.env`. Run `gitleaks detect --config .gitleaks.toml` before releases. See [docs/SECRET_AUDIT.md](./docs/SECRET_AUDIT.md).
