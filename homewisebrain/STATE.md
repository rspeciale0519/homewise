# homewise brain — STATE
Updated: 2026-10-07

## MLS live integration status (2026-10-07)

**Firm Internal agreement completed; public IDX release remains on hold.**

Email review on 2026-10-07 confirmed two DocuSign completion emails dated 2026-10-05 for the same Stellar MLS PDAA between MioDio and HomeWise Realty. The attached agreements are identical: one Firm Internal agreement, $450/year, with the explicit restriction NO CLIENT ACCESS OR EXTERNAL DISTRIBUTION. This verifies completion of that agreement; it does not verify public IDX approval, live API credentials, or a working live feed. Do not describe the public website as approved to launch on this basis.

**Provider follow-up:** Stellar Data Delivery, request 80004: confirm separate public IDX completion/approval, the approved MLS Grid IDX and Back Office subscriptions/use cases, and whether live credentials have been issued. Confirm the delivery vendor, endpoint, exact originating-system name, office/agent identifiers, authorized fields/resources, and any outstanding review or payment step. Never put credentials or full private agreements/emails in these docs.

**Technical activation still required (repository inspection, not live validation):**

- Existing integration: MLS Grid v2 RESO replication through Inngest into Prisma/Supabase, then database-backed listing search/detail/maps. Sources: `src/lib/mls-grid.ts`, `src/inngest/functions/mls-sync.ts`, `src/providers/stellar-mls-provider.ts`.
- Select the authorized live subscription deliberately. `MLS_GRID_BO_TOKEN` / `BBO_ACCESS_TOKEN` take precedence over `MLS_GRID_TOKEN` in sync; the photo downloader separately uses `MLS_GRID_TOKEN`. Updating only the IDX token can leave the older subscription selected. Source: `src/lib/mls-grid.ts:27`, `src/app/api/mls-photo/route.ts:41`.
- Plan a controlled demo-to-live replacement. Both datasets use `mlsSource="stellar"` and SyncState keys `stellar` / `stellar-openhouse`; there is no explicit environment provenance or full-import removal of demo-only rows. Reset/reconcile both cursors, listings, photos, permissions and derived data while preserving approved manual listings and user references. Sources: `prisma/schema.prisma:220`, `src/inngest/functions/mls-sync.ts:65`, `src/inngest/functions/mls-openhouse.ts:6`.
- Update media ingestion before live activation. Since 2026-09-08, MLS Grid media URLs are signed, single-use and expire after one hour; download promptly into owned storage using stable media identity and durable deduplication/quota controls. The existing lazy proxy stores source URLs; its refresh helper is a fallback, not a completed ingestion update. Sources: `src/inngest/functions/mls-sync.mapper.ts:20`, `src/app/api/mls-photo/route.ts:68`, `src/lib/mls-photo-refresh.ts:21`; [current official media documentation](https://docs.mlsgrid.com/api-documentation/api-version-2.0#media).
- Complete public activation/rollback gating across direct database readers, not only the property-provider flag: agent listings/widgets, comparison, sitemap, chatbot and semantic search also read listings. Keep client/public distribution on hold until the appropriate entitlement is confirmed. Sources: `src/providers/index.ts:7`, `src/app/(marketing)/properties/compare/page.tsx:47`, `src/app/sitemap.ts:37`, `src/lib/chatbot/public-site.ts:59`, `src/lib/ai/embeddings.ts:94`.
- Reconcile the intended code revision before implementation. At inspection, `bugfix/local-launch-hardening` was at `4809cd8` with substantial pre-existing local changes. Cached `origin/bugfix/security-hardening-20260827` at `28646bf` contains candidate MLS sync, photo and OpenHouse fixes/tests absent from this checkout; neither deployment nor fresh remote state was verified.
- Re-check current display/field restrictions, IDX/VOW/BO rights, refresh/removal obligations, approved AI use, photo revocation, and notification suppression. A Firm Internal license does not authorize public/client access merely because code or demo rows contain IDX/VOW flags.

**Next steps:** obtain the provider entitlement/provisioning confirmation; reconcile source and implement the blockers; validate an explicitly authorized live sample in isolated database/storage/jobs; then prepare a backed-up, reviewed production cutover with complete reader/worker rollback controls and end-to-end acceptance checks. No live MLS/DB/deployment checks or activation were performed in this assessment. Local and production use a shared Supabase project: schema pushes, imports and storage changes require separate approval for the exact write under `AGENTS.md`.

## Historical June engineering baseline
**.claude automation suite built + shipped (2026-06-14, develop=main, pushed 336424f).**
From /claude-automation-recommender → "build them all": 3 hooks (guard-db-commands =
deny `prisma migrate`/destructive resets + ask on seed/backfill, protecting the shared
prod DB; guard-file-size = 450-LOC warn; lint-changed = ESLint-on-edit), 2 audit
subagents (api-route-auditor, payments-security-reviewer), 2 user skills (scaffold-api-
route, release-promote), plus a read-only MCP/Bash permission allowlist in settings.json.
The tooling caught two real bugs in itself (substring false-positive blocking a commit;
argv-smuggling + untrusted-cwd in the lint hook) — both fixed. `.mcp.json` pin skipped
(marginal for sole-dev + secret-leak risk). See [[skill-build-claude-hook-input-untrusted]].

June history records a demo-data rollout and prior browser verification. That historical baseline does not establish current live provisioning or public-release approval; see the current MLS status above.

## Open threads
- **MLS entitlement and technical activation:** see the canonical status above. Public IDX approval and live provisioning remain unconfirmed; the completed Firm Internal agreement restricts client/external access.
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
  no plan" is now SHIPPED + demo-proven; the June credential-only launch assumption is superseded by the current MLS status above.
- Pre-production, sole-dev: squash develop→main without pause ([[memory]]
  feedback_develop_to_main_no_pause). Shared Supabase project = local writes hit prod.
- On conflict, prefer [[knowledge/superseded]] (memory + verified code override docs).
