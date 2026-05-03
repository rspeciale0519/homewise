# Plan — Direct Mail Ordering (HomeWise → YellowLetterShop)

## Context

**Why this exists.** The user owns YellowLetterShop.com (YLS), a direct-mail-marketing fulfillment business. HomeWise is a brokerage-facing real-estate platform with 186+ agents in central Florida. Today, agents who want to send direct mail (postcards, letters) have to leave HomeWise, find a vendor, and run an out-of-band ordering process. This feature gives Home Wise agents an in-platform way to submit direct-mail orders to YLS without leaving the brokerage's tools, while making it visually clear that YLS is the fulfillment partner.

**Outcome.** A new `/dashboard/direct-mail` section gated to authenticated agents/admins. Agents pick a workflow (Just Sold / Just Listed / Farm / Browse), upload their own artwork (front/back) and a CSV mailing list, fill in mail spec, and submit. The order is persisted, files are stored in Supabase, and a structured email with signed download links is dispatched to a single YLS inbox. Proofs, invoicing, and payment continue to happen via existing YLS email workflows — HomeWise owns intake only. Agents see their order history with date/time stamps (no order numbers exposed), can re-dispatch the email if it got lost, can duplicate an order for repeat farming, and can download the order summary PDF.

**Scope discipline.** This is a v1 with a deliberately small surface area. List sourcing, design templates, in-app proofing, payment, and live status tracking are all explicit non-goals — they are mapped to v2/v3.

---

## Recommended Approach

### 1. Information Architecture

New top-level dashboard section, sibling to `agent-hub`:

```
/dashboard/direct-mail                          → hub (workflow tiles + recent orders)
/dashboard/direct-mail/new?workflow={slug}      → 5-step wizard
/dashboard/direct-mail/orders                   → list (Submitted | Drafts tabs)
/dashboard/direct-mail/orders/[id]              → read-only detail
```

Workflow slugs: `just-sold`, `just-listed`, `farm`, `browse`. Single shared wizard component reads `workflow` from query and conditionally renders one workflow-specific optional field.

Sidebar nav entry "Direct Mail" added to the dashboard sidebar, between Agent Hub and Training.

### 2. Wizard (5 steps)

1. **Order Basics** — workflow + workflow-specific field (subject property address for Just Sold/Listed; campaign name for Farm). Pre-filled when entering from a workflow tile.
2. **Product & Mail Spec** — product type, size, mail class, drop date (≥ 5 business days out), return address (pre-filled from agent profile), special instructions.
3. **Artwork Upload** — front (required), back (required for postcards/letters). Server-side validation: file type (PDF/PNG/JPG), max 50 MB. Extract DPI + dimensions; warn (don't block) when DPI < 300, dimensions don't match selected product, or PDF is RGB instead of CMYK.
4. **Mailing List Upload** — CSV. Server-side validation: UTF-8, headers include required columns (`first_name`, `last_name`, `address_1`, `city`, `state`, `zip`; case-insensitive variants accepted), 1–50,000 rows. Show row count + first 5 rows preview. Quantity defaults to row count, editable.
5. **Review & Submit** — full summary, **required compliance checkbox** ("I confirm artwork meets my brokerage's compliance requirements"), submit button.

Wizard persists draft state on every step transition (`status = "draft"`, `currentStep` tracked). Save-and-exit returns the agent to the hub with the draft visible in the Drafts tab.

### 3. Submission Pipeline (reliability-first)

```
submit → validate server-side
       → persist MailOrder (status="submitted", emailStatus="pending")
       → render order summary PDF (@react-pdf/renderer), upload to Supabase Storage
       → store summaryPdfKey on MailOrder (so detail-page Download works even if email fails)
       → render confirmation page (date/time stamp, "proofs within 1 business day")
       → enqueue Inngest job: dispatchOrderEmail(orderId)
            → generate 30-day signed URLs for front, back, list, summary
            → send email via Resend with links (NOT attachments)
            → on success: emailStatus="sent", record messageId, write MailOrderDispatchLog
            → on failure: retry 3× with backoff, then emailStatus="failed"
            → on final failure: write MailOrderDispatchLog row + email Home Wise admin alert
```

**Why PDF generation happens at submit (not in the dispatch job):** the agent's "Download summary PDF" on the detail page must work even when email dispatch is still in flight or has failed. Generating at submit time guarantees that, and dispatch just attaches the already-stored key.

**Why signed URLs, not attachments.** Resend's per-email attachment limit is 40 MB total. Two 50 MB artwork files + a CSV would silently exceed it. Links also have no scanning issues on the YLS inbox.

**Email shape:**

```
To:       orders@yellowlettershop.com   (configurable env var)
From:     direct-mail@homewisefl.com
Reply-To: <agent's email>
CC:       <agent's email>
Subject:  [HomeWise Direct Mail] {workflow} — {agent name} — {YYYY-MM-DD HH:mm}
Body:     plain-text summary + 4 download links (summary PDF, front, back, list)
```

**Pre-launch deliverability check (non-negotiable):** verify SPF/DKIM/DMARC for `homewisefl.com` in Resend before launch — otherwise YLS emails go to spam silently.

### 4. Order History UI

**`/dashboard/direct-mail/orders`** — two tabs:

- **Submitted** — date/time stamp, workflow, product, list count, drop date, status pill (`Submitted` / `Sending…` / `Awaiting send`). Newest first, paginated 25/page.
- **Drafts** — last-edited timestamp, workflow, current step, Continue / Discard.

**`/dashboard/direct-mail/orders/[id]`** — read-only summary with:

- Header: date/time stamp (large, primary identifier — no order number surfaced), workflow + product, status pill.
- Body: all spec fields, artwork thumbnails (signed-URL backed), list summary + first-5-rows preview.
- Action bar: **Download summary PDF**, **Resend to YLS** (rate-limited 1 per 5 min, re-runs identical dispatch), **Duplicate** (creates new draft, modal asks whether to copy mailing list).

### 5. Data Model (Prisma)

Two new models, following existing string-status convention.

**`MailOrder`** — fields: `id`, `userId`, `status` (`"draft"|"submitted"`), `emailStatus` (`"none"|"pending"|"sent"|"failed"`), `currentStep`, `submittedAt`, `lastDispatchedAt`, `dispatchAttempts`, `emailMessageId`, `workflow`, `subjectPropertyAddress?`, `campaignName?`, `productType`, `productSize`, `mailClass`, `dropDate`, `quantity`, `listRowCount`, `specialInstructions?`, `returnAddress` (Json), `frontFileKey?`, `backFileKey?`, `listFileKey?`, `summaryPdfKey?`, `complianceConfirmed`, `createdAt`, `updatedAt`. Indexes: `(userId, status)`, `(userId, createdAt)`, `(status, emailStatus)`, `(submittedAt)`.

**`MailOrderDispatchLog`** — `id`, `orderId`, `attemptedAt`, `success`, `emailMessageId?`, `errorMessage?`, `triggeredBy` (`"auto"|"resend_button"|"admin_retry"`). Index: `(orderId, attemptedAt)`.

Backref on `UserProfile`: `mailOrders MailOrder[]`.

**Storage layout** (private Supabase bucket `direct-mail-orders`):
```
direct-mail-orders/{orderId}/front.{ext}
                            /back.{ext}
                            /list.csv
                            /summary.pdf
```

### 6. Branding

**Treatment A (subtle pill):** small "Powered by YellowLetterShop" pill in the breadcrumb/nav row on every direct-mail page (muted yellow, never loud). HomeWise's crimson/navy serif identity stays primary throughout.

**Plus** a "Fulfilled by YellowLetterShop.com" footer card on the post-submit confirmation page so the agent unambiguously knows where the order is going.

### 7. Future-Proofing (not v1 work)

- The `dispatchOrderEmail` Inngest function is the swap point for a future YLS API. When that exists, `dispatchOrderApi` can be feature-flagged in alongside the email path with no UI changes.
- v2 candidates: pull list from HomeWise CRM contacts; v3: YLS list-building services; later: in-app template gallery, real-estate-aware property-data integration, status webhooks from YLS.

---

## Critical Files

### To create

- `prisma/schema.prisma` (modify, add 2 models + UserProfile backref)
- `src/app/dashboard/direct-mail/layout.tsx` — shared chrome (co-brand pill, page heading slot). Auth/role checks remain in each page (matches existing `agent-hub/page.tsx` pattern).
- `src/app/dashboard/direct-mail/page.tsx` — hub: workflow tiles + recent orders strip
- `src/app/dashboard/direct-mail/new/page.tsx` — wizard host
- `src/app/dashboard/direct-mail/new/_components/wizard.tsx` — main wizard state machine (client)
- `src/app/dashboard/direct-mail/new/_components/step-basics.tsx`
- `src/app/dashboard/direct-mail/new/_components/step-spec.tsx`
- `src/app/dashboard/direct-mail/new/_components/step-artwork.tsx`
- `src/app/dashboard/direct-mail/new/_components/step-list.tsx`
- `src/app/dashboard/direct-mail/new/_components/step-review.tsx`
- `src/app/dashboard/direct-mail/orders/page.tsx` — list (tabs)
- `src/app/dashboard/direct-mail/orders/[id]/page.tsx` — read-only detail
- `src/app/dashboard/direct-mail/_components/yls-pill.tsx` — co-brand pill
- `src/app/dashboard/direct-mail/_components/yls-fulfillment-footer.tsx`
- `src/app/api/direct-mail/orders/route.ts` — POST create-draft, GET list (server-action alternative also fine)
- `src/app/api/direct-mail/orders/[id]/route.ts` — GET, PATCH (advance step / submit), DELETE (discard draft)
- `src/app/api/direct-mail/orders/[id]/resend/route.ts` — POST trigger re-dispatch (rate-limited)
- `src/app/api/direct-mail/orders/[id]/duplicate/route.ts` — POST clone into new draft
- `src/app/api/direct-mail/upload/artwork/route.ts` — POST upload + validate artwork file
- `src/app/api/direct-mail/upload/list/route.ts` — POST upload + validate CSV
- `src/lib/direct-mail/schemas.ts` — Zod schemas for each wizard step + final submit
- `src/lib/direct-mail/csv-validator.ts` — header normalization, row count, preview rows
- `src/lib/direct-mail/artwork-validator.ts` — DPI/dimension extraction (uses `pdf-lib` for PDF, raster lib for PNG/JPG)
- `src/lib/direct-mail/order-summary-pdf.tsx` — `@react-pdf/renderer` doc
- `src/lib/direct-mail/email.ts` — Resend send helper (links, not attachments)
- `src/lib/direct-mail/storage.ts` — Supabase Storage upload + signed URL helpers
- `src/lib/inngest/functions/dispatch-mail-order.ts` — Inngest function with retry policy
- `src/lib/inngest/client.ts` — verify exists; create if not
- `src/app/api/inngest/route.ts` — verify exists; create if not
- `src/app/admin/direct-mail/page.tsx` — admin failure-recovery view (failed dispatches list)
- Tests co-located with `.test.ts` for validators, schemas, and email body builder.

### To modify

- `src/components/dashboard/sidebar.tsx` (or equivalent — find via grep) — add "Direct Mail" nav item between Agent Hub and Training, gated to agents/admins.
- `prisma/schema.prisma` — add `MailOrder`, `MailOrderDispatchLog`, `UserProfile.mailOrders`.
- `.env.example` / `.env.local` — add `YLS_ORDERS_INBOX_EMAIL`, `HOMEWISE_DIRECT_MAIL_FROM_EMAIL`, `DIRECT_MAIL_ADMIN_ALERT_EMAIL`, `DIRECT_MAIL_DROP_DATE_MIN_BUSINESS_DAYS=5`.

### Reuse (do not duplicate)

- `src/lib/supabase/server.ts` — `createClient()` for SSR auth
- `src/lib/prisma.ts` — Prisma client
- `src/components/dashboard/access-denied.tsx` — role-gating fallback
- `src/data/content/agent-resources.ts` (`COMPANY_IDENTIFIERS`) — brokerage info for the order summary PDF footer
- `src/lib/constants.ts` (`PHONE`, `FAX`) — brokerage phone/fax for return address default
- shadcn UI primitives already installed (Button, Dialog, Select, Input, Textarea, AlertDialog, etc.)
- `inngest`, `resend`, `pdf-lib`, `@react-pdf/renderer`, `@supabase/supabase-js`, `zod`, `nanoid` — all in `package.json` already
- Auth role check pattern from `src/app/dashboard/agent-hub/page.tsx` (lines 38–50)

### Pre-flight checks before implementation

- Verify Inngest is wired up (env vars `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, dev tunnel, `/api/inngest` route). If not present, bootstrap is part of the work.
- Verify Resend domain `homewisefl.com` has SPF/DKIM/DMARC verified. If not, this is a launch blocker.
- Confirm Supabase Storage has (or can create) a private `direct-mail-orders` bucket with appropriate RLS so only owners + admins can sign URLs.

---

## Implementation Sequence (suggested phases for `/git-workflow-planning:checkpoint`)

1. **Schema + storage + scaffolding** — Prisma models, migration, storage bucket, env vars, route shells, sidebar entry, layout with role gating, hub page skeleton.
2. **Wizard front-end** — all 5 steps with Zod schemas + client-side UX, draft persistence, Save & Exit. Stub server actions return success.
3. **Validation layer** — CSV validator, artwork validator (DPI/dimension extraction, sample row preview), all server-side. Co-located unit tests.
4. **Submission + dispatch pipeline** — final submit endpoint persists order, generates summary PDF, kicks off Inngest job, dispatch function sends email with signed URLs, retry + failure logging.
5. **Order history UI** — list with tabs, detail page, Download/Resend (rate-limited)/Duplicate actions.
6. **Branding pass + admin failure-recovery view** — co-brand pill, fulfillment footer, `/admin/direct-mail` page for surfacing failed dispatches with manual retry.

---

## Verification

End-to-end happy path with chrome-devtools MCP (per CLAUDE.md Rule 4):

1. Run `npm run db:push` after schema changes; confirm migration applies cleanly to the Supabase Postgres pooler (per Rule 8).
2. `npm run dev`; sign in as a seeded agent.
3. Navigate to `/dashboard/direct-mail`; click "Just Sold" tile.
4. Step through wizard with: workflow + subject property address → postcard 6×9 + drop date 7 days out → upload a real PDF front + back (verify DPI warning fires for low-DPI sample) → upload a CSV (verify row count and first-5-rows preview) → check compliance box → submit.
5. Confirmation page renders with date/time stamp + "proofs within 1 business day" copy.
6. Open the YLS test inbox (or use a Resend dev address) — confirm email arrived with 4 working signed URLs and no attachments.
7. Open the order detail page — verify all fields, thumbnails, action buttons; click **Resend** within 5 min → confirm rate-limit error; wait 5 min → confirm re-dispatch creates a new `MailOrderDispatchLog` row.
8. Click **Duplicate** → choose "Include the mailing list" → land in wizard step 1 of a new draft with all fields pre-filled. Walk through to a second submission to confirm cloning works end-to-end.
9. Force a dispatch failure (point `YLS_ORDERS_INBOX_EMAIL` at an invalid address) → after 3 retries, confirm `emailStatus="failed"`, admin alert email arrives, and the order surfaces in `/admin/direct-mail`.

Quality gates (run before each `/git-workflow-planning:checkpoint`):
- `npm run type-check`
- `npm run lint`
- `npm run test:run`
- All source files ≤ 450 LOC (CLAUDE.md project rule).

---

## Out of Scope (explicit non-goals)

- In-app design templates / template gallery
- In-app proofing UI / proof versioning
- Payment processing in HomeWise (continues via YLS invoicing)
- Live order status beyond "Submitted" (no API yet)
- Pulling lists from HomeWise CRM contacts (v2)
- YLS list-building services (v2/v3)
- Brokerage compliance enforcement (agent attests via checkbox; no automated check)
- Order numbers visible to agents (date/time stamp only)
- Multi-rep YLS routing (single shared inbox v1)
