# Index
Catalog of the homewise brain. SessionStart reads this.

## Skills
- [[skill-supabase-prisma-db-push]] — supabase · established — schema via `db push`, never `migrate dev`; shared prod DB
- [[skill-ui-dnd-kit-drag-overlay]] — ui · established — dnd-kit overlay that tracks the cursor; verify mid-drag
- [[skill-build-vercel-monitor]] — build · established — monitor Vercel deploys to READY after every push
- [[skill-build-vercel-jsdom-lambda]] — build · established — keep jsdom/isomorphic-dompurify out of the lambda; sanitize-html server, SanitizedHtml client
- [[skill-integrations-mls-grid-data-tiers]] — integrations · provisional — BBO token returns BO/IDX/VOW superset; IDX-only re-sync strips flags; tier gating + access log
- [[skill-api-route-variant-auth-audit]] — api · provisional — gate EVERY route variant; explicit `select` on public reads
- [[skill-build-claude-hook-input-untrusted]] — build · provisional — hook input is untrusted; anchor command guards, validate file_path/cwd
- [[skill-testing-mock-manual-smoke]] — testing · provisional — tests mock Prisma+Supabase; manual smoke is real validation

## Knowledge
- [[knowledge/orientation]] — current — stack, layout, entry points, conventions
- [[knowledge/features]] — current (recon 06-14) — feature inventory; MLS suite + IDX/VOW/BBO tiers now shipped
- [[knowledge/roadmap]] — current (recon 06-14) — shipped vs planned; MLS now shipped/demo-proven, gap = live non-demo creds
- [[knowledge/superseded]] — current — doc/comment/assumption overrides (proxy.ts, jsdom, db push, pricing intent)

## Recent journal
- [[journal/2026-06-14]] — .claude automation suite (hooks/subagents/skills) + security hardening
- [[journal/2026-06-13]] — IDX/VOW/BBO compliance tiers + prod go-live + dompurify/jsdom lambda fixes
- [[journal/2026-06-12]] — browser E2E smoke 100%, MLS native suite, location map
- [[journal/2026-06-10]] — MLS go-live demo-data proof (12,793 listings)
- [[journal/2026-06-07]] — brain initialized + backfilled

## Journal backfill (historical milestones, git-reconstructed)
- [[journal/2026-05-03]] — direct mail ordering (PR #34)
- [[journal/2026-04-12]] — admin doc management + RIUSA groundwork + slugs (PR #14–24)
- [[journal/2026-04-09]] — in-app PDF document tooling, 5 phases + multi-signature
- [[journal/2026-03-28]] — Stripe agent-subscription billing
- [[journal/2026-03-04]] — AI platform build-out, Phases 1–8 (PR #5)
- [[journal/2026-02-28]] — project scaffold + homepage foundation
