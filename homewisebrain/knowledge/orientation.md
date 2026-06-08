---
kind: knowledge
slug: orientation
status: current
updated: 2026-06-07
layer: orientation
sources:
  - code:package.json
  - code:src/app
  - code:src/proxy.ts
  - code:prisma/schema.prisma
  - code:src/lib/admin.ts
  - memory:project_sole_developer
---

# Orientation — homewise

Real-estate SaaS for a Florida brokerage (HomeWise FL / RIUSA): public marketing
site + MLS search, an agent portal, and a staff admin console. Sole developer
([[memory]] project_sole_developer); pre-production, no real users yet.

## Stack
- **Next.js 16** App Router, React 19 — `package.json` (`next@^16.1.6`). Scripts:
  `dev`, `build` (`prisma generate && next build`), `type-check`, `test` (vitest),
  `verify` (lint+type-check+test+build).
- **Prisma 6** over **Supabase Postgres**; **Supabase Auth** via `@supabase/ssr`.
  Managed with `prisma db push`, NOT migrations — see [[skill-supabase-prisma-db-push]].
- **Stripe** billing; **Anthropic + OpenAI** SDKs (chatbots/CMA/valuations);
  **pdf-lib + react-pdf** (in-app PDF tooling); **mapbox-gl** + MLS Grid; **dnd-kit**
  (drag organize); **Tiptap** (rich text); **Inngest** (jobs); **Resend**/**Twilio**.

## Layout (source under `src/`)
- `src/app/` — `(marketing)` public site, `admin/` staff console, `dashboard/`
  agent portal, `api/` route handlers.
- `src/components/` — feature-grouped (admin, billing, calculators, chat,
  documents, pdf, pricing, properties, training, ui, …).
- `src/lib/` — `prisma.ts`, `supabase/` (client/server/admin/middleware),
  `admin.ts` + `admin-api.ts` (authz), `stripe.ts`, `direct-mail/`, `slug/`,
  `chatbot/`, MLS/walk-score/great-schools integrations.
- `prisma/` — `schema.prisma` + many seed/backfill scripts. `archive/` — retired
  files (no-delete rule).

## Entry points
- Root layout `src/app/layout.tsx` (SupabaseProvider, metadata, fonts).
- **Middleware is `src/proxy.ts`** (Next 16 proxy convention — NOT `middleware.ts`,
  which is archived). Guards `/dashboard` + `/admin` via `updateSession`, sets
  lead-source + listing-view cookies.

## Data + auth
- `prisma/schema.prisma` — ~80 models across listings, CRM (Contact/Tag/Task/
  Transaction), training (TrainingContent/Course/Section/CourseItem/Enrollment),
  billing (Subscription/ProductConfig/PaymentRecord/EntitlementConfig), documents
  (Document/Category/Membership/Signature/DeletionLog), chat, AI usage, mail orders.
- Supabase Auth (cookie session). Server authz: `requireAdmin()` (`src/lib/admin.ts`,
  checks `UserProfile.role==="admin"`); API helpers `requireAuthApi`/`requireStaffApi`/
  `requireAdminApi` (`src/lib/admin-api.ts`). Audit EVERY route variant —
  see [[skill-api-route-variant-auth-audit]].

## Conventions
- TS strict, no `any`; Zod at API boundaries; **450-LOC source-file cap**; Server
  Components by default; tests co-located `.test.ts(x)` (mock Prisma + Supabase, so
  manual smoke is the real validation — [[skill-testing-mock-manual-smoke]]).
- Git flow `develop` → `main`; sole-dev squashes develop→main without pause
  ([[memory]] feedback_develop_to_main_no_pause). Monitor Vercel after every push
  ([[skill-build-vercel-monitor]]).
- **One shared Supabase project** for local + prod — local migrations/seeds write
  to production. Use the pooler host, never the direct `db.*` host (CLAUDE.md Rule 8).

## Where to look next
- What exists + build status → [[knowledge/features]]
- What's shipped / planned → [[knowledge/roadmap]]
- Doc-vs-reality overrides → [[knowledge/superseded]]
