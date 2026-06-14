# homewise brain — STATE
Updated: 2026-06-14

## Current focus
**.claude automation suite built + shipped (2026-06-14, develop=main, pushed 336424f).**
From /claude-automation-recommender → "build them all": 3 hooks (guard-db-commands =
deny `prisma migrate`/destructive resets + ask on seed/backfill, protecting the shared
prod DB; guard-file-size = 450-LOC warn; lint-changed = ESLint-on-edit), 2 audit
subagents (api-route-auditor, payments-security-reviewer), 2 user skills (scaffold-api-
route, release-promote), plus a read-only MCP/Bash permission allowlist in settings.json.
The tooling caught two real bugs in itself (substring false-positive blocking a commit;
argv-smuggling + untrusted-cwd in the lint hook) — both fixed. `.mcp.json` pin skipped
(marginal for sole-dev + secret-leak risk). See [[skill-build-claude-hook-input-untrusted]].

**MLS suite is feature-complete and prod-live on DEMO data.** The big arc (May→June) is
done: MLS native suite (PR #56), MLS go-live demo-proof (12,793 listings), browser E2E
smoke 100% (PR #57), interactive location map, and IDX/VOW/BBO compliance tiers flipped
LIVE in prod (PR #58). develop=main, app.homewisefl.com READY.

## The one gate to public launch
Live (non-demo) Stellar MLS credentials. Everything is built + demo-proven; remaining =
set real prod token/`OriginatingSystemName`/office, flip `PROPERTY_PROVIDER=stellar` +
`MLS_PUBLIC_SEARCH_ENABLED=true` (currently gated OFF), re-backfill, re-run E2E.

## Open threads
- **Live MLS creds** (above) — the launch blocker. `OPENAI_API_KEY` missing locally →
  NL search/embeddings unproven.
- **Operational MLS compliance (non-code):** confirm real DMCA designated-agent email
  (placeholder `dmca@homewisefl.com`), monthly domain-usage report to MLS Grid §VII(c),
  24h breach-notification runbook §V(a).
- **Agent-listings widget** untested against demo (Rob can set an agent's MLS ID via admin
  UI to populate; auto-mode won't edit a prod Agent row).
- **Admin shell isn't mobile** — sidebar doesn't collapse < sm ([[memory]] feedback_mobile_first).
- **Training Hub v2/v3** — extracted plans (`269a6df`), not started; v1 shipped inert
  columns so v2 needs no migration.
- **Local demo env:** stale Windows portproxy hijacks 127.0.0.1:3000-3005 → run dev on
  `127.0.0.1:3100`; after dev restart re-register Inngest via `PUT /api/inngest`.

## Active skills in play
- [[skill-supabase-prisma-db-push]] — db push, never migrate dev (established)
- [[skill-build-vercel-monitor]] — monitor deploys after every push (established)
- [[skill-build-vercel-jsdom-lambda]] — keep jsdom out of the lambda; sanitize-html server, SanitizedHtml client (established)
- [[skill-integrations-mls-grid-data-tiers]] — BBO token superset + IDX/VOW/BBO gating (provisional)
- [[skill-api-route-variant-auth-audit]] — gate every route variant (provisional)
- [[skill-build-claude-hook-input-untrusted]] — hook input is untrusted; anchor guards, validate paths (provisional)
- [[skill-ui-dnd-kit-drag-overlay]] — drag overlay tracking (established)
- [[skill-testing-mock-manual-smoke]] — manual smoke is the real validation (provisional)

## Notes
- Knowledge layer reconciled 2026-06-14 (watermark moved 06-07 → 06-14): roadmap.md +
  features.md corrected — the MLS work that 06-07 called "the largest gap / seed data /
  no plan" is now SHIPPED + demo-proven; only live non-demo creds remain.
- Pre-production, sole-dev: squash develop→main without pause ([[memory]]
  feedback_develop_to_main_no_pause). Shared Supabase project = local writes hit prod.
- On conflict, prefer [[knowledge/superseded]] (memory + verified code override docs).
