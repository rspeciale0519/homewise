# Agent Application Approval — Build Spec

GOAL: Add a public agent-application flow → admin approval queue → on approval,
auto-create Agent + auto-issue invite + email a registration link. Full design:
.claude/plans/feature-agent-application-approval.md (authoritative for HOW).

## CURRENT STATE (do not rediscover)
- Sign-up is invite-only by design. `/register` → `supabase.auth.signUp` →
  `src/app/auth/callback/route.ts` creates UserProfile + assigns role (agent only
  with a valid invite). No approval workflow exists today.
- Reuse, do not reinvent: `src/lib/invite-codes.ts` (createInviteCode, 7-day),
  `src/lib/email/index.ts` (sendEmail) + `src/lib/email/templates.ts`,
  `requireAdminApi`/`isError` (`src/lib/admin-api.ts`), `generateSlug`
  (`src/lib/utils.ts`), submissions UI pattern (`src/components/admin/
  submission-table.tsx`, `src/app/api/admin/submissions/route.ts`).

## PHASE 1 — Data model + schemas
EXIT CRITERIA (each must be shown in transcript):
- `grep "model AgentApplication" prisma/schema.prisma` matches (fields per plan:
  status default "pending", hasMlsAccess, reviewedBy/At, reviewNotes, agentId).
- `npx prisma db push` exits 0  (⚠ OWNER-GATED — see HARD CONSTRAINTS).
- `npx prisma generate` exits 0.
- `src/schemas/agent-application.schema.ts` exists and exports
  agentApplicationSchema, adminApplicationFilterSchema, applicationReviewSchema.
- `npm run type-check` exits 0.

## PHASE 2 — Public application flow
EXIT CRITERIA:
- These files exist: `src/app/(marketing)/become-an-agent/page.tsx`,
  `src/components/agent-application/application-form.tsx`,
  `src/components/agent-application/mls-redirect-notice.tsx`,
  `src/app/api/agent-application/route.ts`.
- MLS branch: No-MLS path shows intent question + explanation + RIUSA button
  (`NEXT_PUBLIC_RIUSA_URL`, fallback "#") and creates NO AgentApplication.
- POST route validates with agentApplicationSchema, honeypot-guarded, rejects
  hasMlsAccess=false, creates row status="pending", sends applicant + admin emails.
- `grep` shows agentApplicationReceivedEmail + agentApplicationAdminNotificationEmail
  added to `src/lib/email/templates.ts`.
- `npm run type-check` and `npm run lint` exit 0.

## PHASE 3 — Admin approval queue
EXIT CRITERIA:
- Files exist: `src/app/admin/agent-applications/page.tsx`,
  `src/components/admin/agent-application-table.tsx`,
  `src/app/admin/agent-applications/[id]/page.tsx`,
  `src/app/api/admin/agent-applications/route.ts`,
  `src/app/api/admin/agent-applications/[id]/approve/route.ts`,
  `src/app/api/admin/agent-applications/[id]/reject/route.ts`,
  `src/lib/agents.ts`.
- `createAgentRecord` extracted into `src/lib/agents.ts` AND imported by both
  `src/app/api/admin/agents/route.ts` and the approve route (grep both).
- Approve route: prisma.$transaction creates Agent (active) + createInviteCode +
  marks application approved with agentId; emails invite link after commit.
- `grep "agent-applications" src/components/admin/admin-sidebar.tsx` matches.
- `npm run type-check` and `npm run lint` exit 0.

## PHASE 4 — Verification (DEFINITION OF DONE)
- `npm run type-check`, `npm run lint`, `npm run build` ALL exit 0 (shown).
- No new/changed source file > 450 lines: show `wc -l` for each new file.
- Best-effort browser E2E via chrome-devtools MCP (dev server 127.0.0.1:3100):
  submit MLS application → appears pending in /admin/agent-applications → approve →
  Agent row + invite code created → invite link registers → lands /dashboard/
  agent-hub as role:agent. Report results with snapshots; build/lint/type-check
  are the firm gate (the No-MLS→RIUSA and approve paths are reported, not gating).

## HARD CONSTRAINTS
- Only invite codes grant role:agent. `/register` without an invite STILL creates a
  plain `user` — unchanged. Un-approved applicants get no UserProfile/Agent row.
- NEVER `prisma migrate`. `prisma db push` ONLY. db push writes the SHARED PROD DB —
  do not run it until the owner has approved; if unapproved, write a blocker to
  docs/temp/agent-application-BLOCKER.md and stop.
- TypeScript strict, no `any`. Zod at every API boundary. No file > 450 LOC.
- New env vars: NEXT_PUBLIC_RIUSA_URL, ADMIN_NOTIFICATION_EMAIL (placeholders OK).
- Commit per phase on branch feature/agent-application-approval (type-check+lint
  clean before each commit). Do not merge to develop without owner sign-off.
