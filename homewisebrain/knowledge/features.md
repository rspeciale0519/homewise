---
kind: knowledge
slug: features
status: current
updated: 2026-06-07
layer: reference
sources:
  - code:src/app
  - code:src/components
  - code:prisma/schema.prisma
  - git:PR-history
---

# Features — homewise (evidence-gated build status)

Status rule: **BUILT** = entrypoint exists AND non-stub logic AND wired end-to-end
(cited path). **PARTIAL** = exists but incomplete. **PLANNED** = referenced, no real
impl. Statuses verified against code paths on 2026-06-07, not doc checkboxes.

## Public marketing site
- **MLS / property listings + photo gallery** — BUILT — `src/app/(marketing)/properties/[id]/page.tsx`;
  `Listing` model + `lib/mls-grid.ts` sync (admin/sync); mosaic `photo-gallery/`, map
  panel, walk-score/school ratings. ⚠ runs on SEED data — real **Stellar MLS
  credentials not yet wired** (research only in `docs/temp/`). See [[knowledge/roadmap]].
- **Mortgage calculators** — BUILT — `(marketing)/mortgage-calculator/` — 11 pages
  (affordability, APR, refinance, points, …) on a shared engine (`lib/calculators`).
- **AI assistant / chatbots** — BUILT — `api/chat/route.ts` (Zod-validated; public/
  agent/dashboard configs via `lib/chatbot/*`; `Conversation`/`ChatMessage`); plus
  `api/ai/*` (CMA, valuation, listing-description, lead-scoring). Config-gated on keys.
- **Pricing page** — BUILT — `(marketing)/pricing/page.tsx` — public **agent-recruitment**
  pricing, drives new-agent signup ([[memory]] project_pricing_page_intent), NOT
  existing-agent plan management.
- **Legal pages** — BUILT — `(marketing)/{privacy-policy,terms-of-service}` (FL-specific).

## Agent portal (`dashboard/`)
- **Agent dashboard** — BUILT — `dashboard/agent/page.tsx` + portal (favorites,
  saved-searches, recently-viewed, profile, settings).
- **In-app PDF document tooling** — BUILT — `dashboard/documents/viewer/page.tsx` +
  `api/documents/*` — react-pdf viewer; annotations typed `"text"|"signature"|"flag"`
  (`types/document-viewer.ts`); multi-signature (draw/upload/picker, one-to-many);
  custom-text w/ font picker; DocuSign-style sign-here flags; export (download/print/
  email) via pdf-lib; drafts/favorites/recents/auto-save. Download keeps fields
  editable; print/email flatten ([[memory]] feedback_pdf_export_flatten_policy).
- **Training hub (v1)** — BUILT — `dashboard/training/page.tsx` (agent learner),
  `admin/training/page.tsx` (authoring, block editor, thumbnails), public
  `(marketing)/learn/[slug]` (SEO/OG/JSON-LD — a **marketing surface**, not internal
  collateral). Content audience flag `agent_only|public_only|both`. v1 ships inert
  columns (`passThreshold`,`dueDays`,`recurDays`,`dripDays`) for v2 to activate.
- **Direct-mail ordering** — BUILT — `dashboard/direct-mail/new/page.tsx` +
  `lib/direct-mail/` — draft→submit (`MailOrder`), CSV + artwork validators, signed-URL
  uploads, dispatch to YellowLetterShop, order-summary PDF. v1 only (proofing/payment/
  tracking are explicit non-goals).
- **Subscription / billing (Stripe)** — BUILT — `dashboard/billing/page.tsx` +
  `components/billing/billing-dashboard.tsx` — checkout/portal/invoices/payment-methods/
  cancel; entitlement engine + feature gating; webhook `api/webhooks/stripe/route.ts`;
  `Subscription`/`ProductConfig`/`PaymentRecord`. RIUSA groundwork merged (bundle renamed
  `riusa_annual_dues`, HomeWise fee dropped) — full RIUSA platform is future.

## Admin console (`admin/`)
- **Admin dashboard** — BUILT — `admin/page.tsx` — `requireAdmin()` + live Prisma
  aggregate stat cards; agents, contacts, campaigns, pipeline, lead-routing, sync,
  AI-usage, team-performance, CMA, settings. Admins land on `/admin` and can switch to
  agent views (role switching).
- **Document library — bulk ops** — BUILT — `admin/documents/` + `documents-organize/`
  — bulk delete (count-drift 409 guard), bulk upload, cross-section bulk drag-to-
  categorize (dnd-kit board, two-level Select All). See [[skill-ui-dnd-kit-drag-overlay]].
- **URL slugs** — BUILT — `lib/slug/resolve.ts` + `api/documents/by-slug/[slug]` —
  admin-controlled slugs migrated TS→DB with `SlugHistory` 301 redirects.

## Cross-cutting
- **Back-navigation** — BUILT — `components/ui/back-button.tsx` — state-preserving across
  calculators, agent-form, viewer toolbar.
- **Auth/role routing** — BUILT — `src/proxy.ts` guards; Google avatar host allowed;
  sign-out full-navigation redirect home.

## Caveats
- AI/MLS/Stripe/Resend/Twilio features are code-complete but **config-gated** on external
  keys; "BUILT" = wired, not "live in prod with real data."
- Admin **layout shell predates mobile** — features are built mobile-aware (touch +
  tap-select fallback, [[memory]] feedback_mobile_first) but the admin sidebar doesn't
  collapse < sm. Pre-existing limitation, tracked in [[knowledge/roadmap]].
