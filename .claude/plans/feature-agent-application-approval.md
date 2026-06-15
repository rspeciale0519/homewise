# feature-agent-application-approval

## Context

HomeWise is the parent brokerage. **HomeWise Agents never pay** to join — but every
prospective agent must be **approved by the corporate office before getting any backend
access**, and anyone **without (or unable to afford) MLS access must be routed to Realty
International USA (RIUSA)** — a separate, not-yet-built site where they pay the annual fee
to become a licensed/MLS-enabled agent.

Today there is **no approval workflow**. Agents are created only by an admin manually
(`/admin/agents/new`) who then issues an invite code; there is no public way to apply and
no concept of a pending request. This feature adds a public **application** flow that lands
in an **admin approval queue**, with an MLS-access branch that redirects un-MLS'd prospects
to RIUSA. On approval, the existing Agent-create + invite-code machinery fires automatically
and emails the applicant a registration link.

**Key security property (unchanged + relied upon):** an un-approved applicant has **no
UserProfile and no Agent row**, so they can never log in or hit any role-gated route. The
only path to `role: "agent"` remains an invite code — now issued *only* on approval. No
new backend gate is required; approval *is* the gate.

**Decisions locked with the user:**
- Entry = a new public application form (applicants kept entirely out of the user/Agent tables until approved).
- MLS branch is **self-declared at application time**; before any RIUSA redirect, show an explanation of *why*, and ask whether they intend to obtain MLS access.
- Approve = **auto-create Agent + auto-issue invite + email the link** (one click).
- Data = a **separate `AgentApplication` model**; Agent rows are created only on approval.

---

## Phase 1 — Data model + schemas

**`prisma/schema.prisma`** — add:
```prisma
model AgentApplication {
  id            String    @id @default(cuid())
  firstName     String
  lastName      String
  email         String
  phone         String?
  licenseNumber String?
  hasMlsAccess  Boolean
  mlsAgentId    String?
  message       String?
  status        String    @default("pending") // pending | approved | rejected
  reviewedBy    String?
  reviewedAt    DateTime?
  reviewNotes   String?
  agentId       String?   // set to the Agent created on approval
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([status])
  @@index([email])
}
```
- Apply with **`prisma db push`** (per the project's Supabase pooler skill — never `migrate dev`; local writes hit the shared prod DB, so confirm before pushing). Run `prisma generate`.
- **`src/schemas/agent-application.schema.ts`** (new) — mirror `src/schemas/contact.schema.ts`:
  - `agentApplicationSchema` (public): firstName/lastName (1–100), email, phone optional, licenseNumber optional, `hasMlsAccess: z.boolean()`, mlsAgentId optional, message optional, plus a honeypot field (e.g. `company: z.string().max(0).optional()`).
  - `adminApplicationFilterSchema`: status enum + pagination (mirror `adminSubmissionFilterSchema`).
  - `applicationReviewSchema`: `{ notes?: string }` for approve/reject bodies.

## Phase 2 — Public application flow

- **`src/app/(marketing)/become-an-agent/page.tsx`** (new) — marketing-group server page that renders the form. Add a CTA link to it from the marketing nav/footer (mirror how `/register` is linked).
- **`src/components/agent-application/application-form.tsx`** (new, client) — model on `src/components/auth/register-form.tsx` (touched-after Zod validation, error banner). Flow:
  1. Ask **"Do you have active MLS access?"** (Yes/No).
  2. **Yes** → show the full application fields (name, email, phone, license #, optional MLS ID, message) → submit.
  3. **No** → ask **"Do you want to obtain MLS access / do you plan to?"** then show an **explanatory interstitial** (`mls-redirect-notice.tsx`): explains HomeWise requires MLS access, and RIUSA is the paid on-ramp to get licensed + MLS-enabled, after which they can become a HomeWise Agent for free. Then a **"Continue to Realty International USA"** button → `process.env.NEXT_PUBLIC_RIUSA_URL` (placeholder fallback `"#"` with a "coming soon" note, since RIUSA isn't built). **No `AgentApplication` is created in the No-MLS branch** — they leave for RIUSA.
  - Mobile-first: single-column, large tap targets (per the project's mobile-first rule).
- **`src/app/api/agent-application/route.ts`** (new) — POST, mirror `src/app/api/contact/route.ts`:
  - Validate with `agentApplicationSchema`; reject if honeypot filled (return fake 201).
  - Reject submissions where `hasMlsAccess === false` (defense-in-depth; UI shouldn't submit these).
  - Optional: block duplicate **pending** applications for the same email.
  - `prisma.agentApplication.create(...)` with `status: "pending"`.
  - Fire-and-await (try/catch, non-fatal) two emails via `sendEmail` (`src/lib/email/index.ts`):
    applicant **"application received"** confirmation, and a **corporate notification** to `process.env.ADMIN_NOTIFICATION_EMAIL` (fallback to `RESEND_FROM_EMAIL`).
- **`src/lib/email/templates.ts`** — add `agentApplicationReceivedEmail(firstName)` and `agentApplicationAdminNotificationEmail(app)` using existing `buildEmailHtml`.

## Phase 3 — Admin approval queue

- **`src/components/admin/admin-sidebar.tsx`** — add `{ href: "/admin/agent-applications", label: "Agent Applications", icon: "agent" }` to the **Team** section; add an `"agent"` icon in `admin-sidebar-icons.tsx` if missing.
- **`src/app/admin/agent-applications/page.tsx`** (new, server) — `await requireAdmin()` (`src/lib/admin.ts`), fetch pending-first applications, render client table.
- **`src/components/admin/agent-application-table.tsx`** (new, client) — mirror `agent-management-table.tsx` / `submission-table.tsx`: status filter (pending/approved/rejected), pagination, row → detail link.
- **`src/app/admin/agent-applications/[id]/page.tsx`** (new, server) — show all fields + **Approve** / **Reject** (with notes) actions.
- **`src/app/api/admin/agent-applications/route.ts`** (new) — GET, `requireAdminApi()` + `isError` guard (`src/lib/admin-api.ts`), filter via `adminApplicationFilterSchema`, paginated (mirror `src/app/api/admin/submissions/route.ts`).
- **Refactor (reuse, not duplicate):** extract the Agent-create body from `src/app/api/admin/agents/route.ts` POST into a shared helper `createAgentRecord(data)` in `src/lib/agents.ts` (uses `generateSlug` from `src/lib/utils.ts` + collision handling). Rewire the existing POST to call it. (Keeps both files under the 450-LOC rule and gives the approve route one source of truth.)
- **`src/app/api/admin/agent-applications/[id]/approve/route.ts`** (new) — POST, `requireAdminApi`:
  1. Load application; 409 if not `pending`.
  2. In a `prisma.$transaction`: `createAgentRecord` from the application (firstName, lastName, email, phone, mlsAgentId, `active: true`), `createInviteCode(agent.id)` (`src/lib/invite-codes.ts`), update application → `status: "approved"`, `reviewedBy`, `reviewedAt`, `agentId`.
  3. After commit, email applicant `agentApplicationApprovedEmail(firstName, inviteUrl)` where `inviteUrl = ${origin}/register?invite=${inviteCode}` (non-fatal on failure; surface a warning in the response).
- **`src/app/api/admin/agent-applications/[id]/reject/route.ts`** (new) — POST, `requireAdminApi`: set `status: "rejected"` + review fields; email `agentApplicationRejectedEmail(firstName, notes?)` (non-fatal).
- **`src/lib/email/templates.ts`** — add the approved + rejected templates.

## Phase 4 — Verification

- `npm run type-check`, `npm run lint`, `npm run build` all clean.
- **Manual E2E via chrome-devtools MCP** (dev server on `127.0.0.1:3100` per project note; re-register Inngest if needed):
  1. `/become-an-agent` → choose **No MLS** → verify intent question + explanation interstitial + RIUSA button (placeholder).
  2. Restart flow → **Yes MLS** → submit → expect success + `AgentApplication` row (`pending`) + applicant/admin emails (verify Resend logs).
  3. As admin → `/admin/agent-applications` → application appears in **pending** → open detail → **Approve**.
  4. Confirm: Agent row created (`active`, slug, invite code set), application → `approved` with `agentId`, approval email contains a working `/register?invite=...` link.
  5. Open the invite link → register → land on `/dashboard/agent-hub` as `role: "agent"`.
  6. Negative: confirm a brand-new plain user (no invite) still **cannot** reach `/admin` or `/dashboard/agent-hub` (existing gates).
  7. Reject path: submit another → **Reject** with notes → status `rejected`, rejection email sent, no Agent created.
- Check mobile viewport for both the public form and the admin queue (mobile-first rule).

## Notes / assumptions
- No-MLS applicants are routed to RIUSA and **never enter the HomeWise queue**; the intent sub-question only tailors messaging — RIUSA is the on-ramp either way.
- `NEXT_PUBLIC_RIUSA_URL` and `ADMIN_NOTIFICATION_EMAIL` are new env vars (placeholders acceptable until RIUSA launches).
- No new role/gate needed; "no account until approved" is the enforcement. The existing public `/register` without an invite still creates a plain `user` — unchanged.
- Spam: honeypot only for now (no rate-limit infra exists); flag heavier protection as a follow-up if abuse appears.
