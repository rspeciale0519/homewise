---
kind: knowledge
slug: roadmap
status: current
updated: 2026-06-07
layer: roadmap
sources:
  - git:log-all
  - code:.claude/plans
  - code:docs/plans
  - code:docs/ideas
---

# Roadmap — homewise

Evidence-based against `git log --all` (PR#/SHA cited). The plan-driven workflow
(CLAUDE.md Rule 9) leaves a clean audit trail — nearly every `.claude/plans/*.md`
maps 1:1 to a merged PR. 31 of ~34 plans are shipped.

## Shipped (plan → evidence)
- Site rebuild / scaffold / homepage / agent directory / auth — `plan-001.md` — `800b5b0`…`90c48de`
- MLS Foundation — `feature-mls-foundation.md` — PR #1, `34e6730`
- SEO/perf/launch — `feature-seo-performance-polish.md` — PR #2
- Agent Dashboard (invite codes, protected PDF serving) — `feature-agent-dashboard.md` — merge `28bfdbd`
- Legal pages — `feature-legal-pages.md` — `9d52709`
- Admin Dashboard — `kind-sparking-torvalds.md` (mis-named) — `2838241`…`eae3f69`
- AI Platform (Phases 1–8: CRM, marketing automation, chatbot, agent tools, market stats) — `feature-platform-completion.md` — PR #5
- UI Behavioral Upgrades (Radix, Sonner) — `feature-ui-behavioral-upgrades.md` — PR #6
- Training Hub *redesign* (pre-v1) — `docs/plans/2026-03-08-training-hub-redesign.md` — PR #7 (superseded by v1)
- ESLint 9 flat config — `bugfix-eslint-config.md` — `6438698`
- Property Photo Gallery — `feature-property-photo-gallery.md` — `dd54c57`…`68b9a79`
- Completion gaps (trend charts, CMA PDF, AI model tiering) — `feature-completion-gaps.md` — `9fd7636`,`ad19240`,`bfc159d`
- Agent Subscription & Billing (Stripe) — `feature-agent-subscription-billing.md` — `cd5b32a`…`3a0a95a`
- Dashboard Billing Redesign — `feature-dashboard-billing-redesign.md` — `b99d207`
- In-app PDF Viewer + multi-signature — `feature-document-viewer.md` — `23cf5cb`(P1)…`30132ef`(P5)
- Admin URL Slugs — `feature-admin-url-slugs.md` — PR #15
- Admin Document Delete — `feature-admin-document-delete.md` — PR #16
- Admin Document Organize (drag board) — `feature-admin-document-organize.md` — PR #17
- RIUSA Platform Groundwork — `feature-riusa-platform-groundwork.md` — PR #19
- Admin/Agent default dashboard view — `feature-{admin,agent}-*-default-*.md` — PR #22, #23
- Bugfix: admins log in to /admin — `bugfix-admin-login-defaults-to-admin.md` — PR #25
- Back-Navigation refactor (2 phases) — `refactor-back-nav-phase-{1,2}.md` — PR #29, #31
- Custom Text edit / fonts — `feature-custom-text-edit-fonts.md` — PR #32
- Sign-Here Flags — `feature-sign-here-flags.md` — PR #33
- Direct Mail Ordering — `feature-direct-mail-ordering.md` — PR #34
- Document Library bulk delete / upload / drag-categorize — `feature-{document-library,bulk-upload,bulk-drag-categorize,bulk-drag-on-section-boards}.md` — PR #35, #37, #39, #47, #49
- Training Hub **v1** — `feature-training-hub-v1.md` — PR #51 + consistency PR #53 + security gate `7fe8dad`

## Planned / not started
- **Training Hub v2** — Compliance teeth, certificates, quizzes — `feature-training-hub-v2.md`.
  v1 left inert columns (`passThreshold`,`dueDays`,`recurDays`,`dripDays`) so v2 activates
  with NO migration. Extracted as standalone plan in `269a6df`; zero impl commits.
- **Training Hub v3** — Engagement/discoverability/analytics (server-side FTS, versioning,
  discussions, notes, bookmarks) — `feature-training-hub-v3.md`. Assumes v1+v2 first. Not started.
- **Chrome CDP MCP server** — `docs/plans/2026-03-10-chrome-cdp-mcp-server-plan.md` — external
  tooling, not app code; likely obsoleted by the mandated `chrome-devtools` MCP (CLAUDE.md Rule 4).

## Largest real gap (non-plan)
- **Live Stellar MLS data integration.** MLS foundation shipped on SEED data; real
  credentials/feed not wired. Only research docs exist (`docs/temp/stellar-mls-*`,
  `idx-vendor-vs-direct-api-research.md`, `mls-grid-setup-*`). No feature plan yet.

## Idea backlog (uncommitted)
- `docs/ideas/master-ideas.md` — AI buyer/seller tools, "Ask This Home" chatbot, NL search,
  match scores, recruiting/retention. Explicitly "nothing here is committed."
- `docs/ideas/vendor-monetization-model.md` — vendor/agent fee strategy (informed billing + RIUSA).

## Plan-name caveats
`kind-sparking-torvalds.md` = Admin Dashboard; `sparkling-brewing-clarke.md` = dup of
SEO/perf; `plan-001.md` = full-site rebuild; `feature-document-library.md` = the bulk-DELETE
plan (not a generic library plan).
