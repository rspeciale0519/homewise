---
type: skill
status: established
confidence: high
updated: 2026-06-07
sources:
  - transcript:2026-05-26
  - transcript:2026-05-28
  - memory:feedback_verify_vercel_builds
---

# Monitor Vercel deploys to completion after every push

## When to use
After every `git push` that reaches `develop`/`main` in homewise.

## The approach
1. After pushing, poll the deployment with the Vercel MCP `get_deployment` (using the
   `dpl_…` + `team_…` IDs).
2. If `BUILDING`, reschedule a wakeup and re-poll (prod builds run ~170–180s).
3. On `READY`, report success. On `ERROR`, fetch build logs, fix, and re-push.
4. This is a **standing expectation**, not a per-task ask ([[memory]] feedback_verify_vercel_builds).

## Pitfalls & anti-patterns
- Don't declare a push "done" before the deploy is READY — Vercel build differs from local
  (it runs `prisma generate && next build` in a clean serverless env; native deps that work
  locally can break there).
- Build = `prisma generate && next build`. There is **no `.github/` CI** and no
  `prisma.seed` key, so the deploy is the only gate.

## Evidence
Recurring explicit prompts across 2026-05-26 → 2026-05-28 to poll specific `dpl_…` IDs and
reschedule on BUILDING. Matches saved memory.

## Revision log
- 2026-06-07 — created from transcript backfill; established (recurring across sessions +
  standing memory).
