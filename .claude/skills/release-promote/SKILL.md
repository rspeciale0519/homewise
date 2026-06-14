---
name: release-promote
description: Promote current work to production for this pre-prod, sole-dev project — verify, squash-merge to develop, immediately fast-promote develop to main WITHOUT pausing for a release-PR, then monitor Vercel deployments until all succeed. Use when the user asks to ship, release, promote to prod, or push to main.
disable-model-invocation: true
---

# Release & Promote (develop → main)

Encodes the confirmed workflow for this repo: pre-production, sole developer, shared Supabase. **Squash to `develop`, then immediately promote to `main` — do NOT pause for a release-PR confirmation.** Then watch Vercel until every deployment is READY.

## Preconditions — verify before promoting
Run the full gate and require all green (this is the repo's `verify` script):
```
npm run lint && npm run type-check && npm run test:run && npm run build
```
If anything fails, STOP and fix — do not promote a red build. Report the failing output.

## Steps

1. **Confirm scope.** Show `git status` and `git log --oneline origin/main..HEAD` so it's clear what will ship. State it in one line.

2. **Land on `develop`.** Ensure work is committed on `develop` (or squash-merge the feature branch into `develop`). Use the project's commit conventions.

3. **Promote to `main` (no pause).** Fast-forward / merge `develop` into `main` and push. Do not open a release PR and do not wait for confirmation between develop and main — that pause is explicitly skipped for this project.
   ```
   git checkout main && git merge --ff-only develop && git push origin main
   git checkout develop
   ```
   (If `--ff-only` is rejected because main has diverged, stop and surface it rather than force-anything.)

4. **Monitor Vercel until READY.** After the push, watch the production deployment(s). Poll deployment status until all show READY; if any deployment FAILS, fetch the build/runtime logs, diagnose, fix on `develop`, re-promote, and re-monitor. Do not declare done until prod is green.
   - Use the Vercel MCP (`list_deployments`, `get_deployment`, `get_deployment_build_logs`, `get_runtime_logs`) for `app.homewisefl.com`.

5. **Guardrails.**
   - Shared Supabase = local/prod share one DB; do NOT run migrations/seeds as part of a promote (schema changes go through `db:push` deliberately, separately).
   - Production env flips (e.g. launch flags, tokens written to Vercel prod) are NOT part of this skill — they require explicit per-action authorization.

6. **Journal.** On success, append a brain journal entry (per `homewisebrain/CLAUDE.md`) with commits, what shipped, and the verified-prod evidence. No secrets/PII.

## Report
End with: commits promoted, the verify results, and the final Vercel deployment status (URL + READY), with evidence.
