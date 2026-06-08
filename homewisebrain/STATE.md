# homewise brain — STATE
Updated: 2026-06-08

## Current focus
**MLS go-live planning (NOT yet building).** A complete, audit-corrected implementation
plan exists at `.claude/plans/feature-mls-go-live.md` (committed + pushed, `f379409`).
It takes the MLS from seed data to a live, compliant Stellar IDX integration: full
site-wide search + HomeWise office listings featured. **Awaiting:** Rob's approval to
start + execution mode (subagent-driven vs inline). Branch will be `feature/mls-go-live`.
Confirmed decision: skip the Back Office feed for launch → CMA/market-stats ship gated
OFF (`ANALYTICS_BO_ENABLED=false`); everything else launches.

## Latest synopsis
2026-06-08: Reviewed MLS foundation, drafted the go-live plan, verified mechanics against
official MLS Grid docs, then ran a 22-agent ultracode audit (112 requirements) that found
v1 NO-GO with 8 blocking defects. Rewrote to v2 closing all 8 (universal IDX visibility
filter, BO sold-analytics gated OFF, Article 19 attribution, sync events restored,
ListingKey identity, persisted cursor, real RESO school fields, pgvector/GIN/polygon-bbox
scale fixes; helpers ordered before sync). v1 archived locally in `archive/plans/`. Full
detail in [[journal/2026-06-08]]. Largest remaining real gap is unchanged: the live feed
needs the approved MLS Grid token + sample data before Phases 9–10. See [[knowledge/roadmap]].

## Open threads
- **Largest real gap:** live Stellar MLS data integration — foundation runs on SEED
  data, real credentials not wired. Research only in `docs/temp/`. See [[knowledge/roadmap]].
- **Training Hub v2/v3** extracted as standalone plans (`269a6df`), not started. v1 shipped
  inert columns so v2 activates with no migration.
- **Admin shell isn't mobile** — features are built mobile-aware but the sidebar doesn't
  collapse < sm ([[memory]] feedback_mobile_first).

## Active skills in play
- [[skill-supabase-prisma-db-push]] — db push, never migrate dev (established)
- [[skill-build-vercel-monitor]] — monitor deploys after every push (established)
- [[skill-api-route-variant-auth-audit]] — gate every route variant (provisional)
- [[skill-ui-dnd-kit-drag-overlay]] — drag overlay tracking (established)
- [[skill-testing-mock-manual-smoke]] — manual smoke is the real validation (provisional)

## Notes
- Knowledge layer is `status: current` (built from evidence 2026-06-07), NOT via the
  formal knowledge-build runbook — treat build-status claims as code-verified-on-that-date;
  reconcile on next consolidation against `git log` since the watermark.
- Pre-production, sole-dev: squash develop→main without pause ([[memory]]
  feedback_develop_to_main_no_pause). Shared Supabase project = local writes hit prod.
- On conflict, prefer [[knowledge/superseded]] (memory + verified code override docs).
