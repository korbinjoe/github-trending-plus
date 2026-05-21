# Secret audit log

Pre-public release scan for credentials in git history.

## 2026-05-21 — gitleaks v8

```bash
gitleaks detect --source . --config .gitleaks.toml
```

**Result:** No real `GITHUB_TOKEN`, `CRON_SECRET`, or Product Hunt credentials found.

| Finding | File | Verdict |
|---------|------|---------|
| `YOUR_CRON_SECRET` | `docs/DEPLOYMENT.md` | Placeholder in curl examples |
| `gtp-favorites-v1` | `useFavorites.ts`, `types.ts` | Browser localStorage key, not a secret |

`.env` is listed in `.gitignore` and is not tracked.

**Before going public:** Re-run gitleaks after any doc edits; enable GitHub secret scanning (see [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)).
