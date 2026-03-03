# Feature: Admin Dashboard

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Context

The Homewise real estate site now has user auth (Supabase), a user dashboard, and an agent dashboard. The `UserProfile.role` field supports `"user"` and `"agent"`. There is no admin interface — form submissions (contact, home evaluations, buyer requests), property alerts, users, and agents can only be managed via direct database access. Agents are still served from a mock data file (`src/data/mock/agents.ts`) rather than the database, even though the `Agent` Prisma model and seed file already exist.

**Goal:** Build a full admin dashboard at `/admin` with user management, agent CRUD (migrating from mock to DB), form submission viewing, property alert management, and an analytics overview.

**Approach:** Separate `/admin` route group with its own layout, sidebar, and header. New `"admin"` role value. Admin API routes under `/api/admin/`. First admin set manually in DB, then admins can promote others.

---

## Design Decisions

- **Location:** Separate `src/app/admin/` route group (not nested under `/dashboard`) — completely different navigation and purpose
- **Role:** New `"admin"` value for `UserProfile.role` (alongside existing `"user"` and `"agent"`)
- **Access:** First admin bootstrapped via manual DB update. Admins can then promote other users via the UI
- **Agent migration:** Move from mock file to Prisma DB. Seed script already exists at `prisma/seed.ts`
- **Submissions:** Add `status` field (`"new"` / `"read"` / `"archived"`) to ContactSubmission, HomeEvaluation, BuyerRequest models
- **No deletion:** Agents are deactivated (`active: false`), not deleted. Users and submissions are never deleted from the admin UI

---

## Phase 1: Admin Infrastructure & Schema Updates

**Goal:** Add admin role support, update Prisma schema with status tracking on submissions, create admin layout shell with sidebar and header, protect admin routes in middleware.

### Schema changes — `prisma/schema.prisma`

Add `status` field + indexes to the 3 submission models:
- `ContactSubmission`: add `status String @default("new")`, `@@index([status])`, `@@index([createdAt])`
- `HomeEvaluation`: add `status String @default("new")`, `@@index([status])`, `@@index([createdAt])`
- `BuyerRequest`: add `status String @default("new")`, `@@index([status])`, `@@index([createdAt])`

Run `npx prisma db push`

### Middleware — `src/middleware.ts` + `src/lib/supabase/middleware.ts`

- Add `/admin/:path*` to the matcher array
- Add redirect logic: unauthenticated users on `/admin/*` → `/login?redirectTo=/admin`

### Admin auth helper — `src/lib/admin.ts` (NEW)

`requireAdmin()` — server-side function that:
1. Gets Supabase user via `createClient()`
2. Queries `UserProfile` for role
3. Redirects to `/dashboard` if not admin (for pages)
4. Returns `{ user, profile }` on success

### Admin API auth helper — `src/lib/admin-api.ts` (NEW)

`requireAdminApi()` — same logic but returns `{ error: NextResponse }` instead of redirecting (for API routes).

### Admin layout — `src/app/admin/layout.tsx` (NEW)

Server Component. Calls `requireAdmin()`. Renders `AdminHeader` + `AdminSidebar` + `<main>` content area. Same shell structure as `src/app/dashboard/layout.tsx`.

### Admin sidebar — `src/components/admin/admin-sidebar.tsx` (NEW)

Client component. Same architecture as `src/components/dashboard/sidebar.tsx`. Nav items:
- Overview (`/admin`, exact)
- Users (`/admin/users`)
- Agents (`/admin/agents`)
- Submissions (`/admin/submissions`)
- Property Alerts (`/admin/alerts`)

Desktop sidebar + mobile horizontal tabs. Reuse the `SidebarIcon` pattern with new icons (users, inbox, bell).

### Admin header — `src/components/admin/admin-header.tsx` (NEW)

Client component. Shows "Admin" label, "Back to Dashboard" link, "Back to Site" link, Sign Out button. Same pattern as `src/components/dashboard/dashboard-header.tsx`.

### Placeholder overview — `src/app/admin/page.tsx` (NEW)

Simple page with "Admin Dashboard" heading. Fleshed out in Phase 2.

### Files

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` — add status + indexes to 3 submission models |
| Modify | `src/middleware.ts` — add `/admin/:path*` to matcher |
| Modify | `src/lib/supabase/middleware.ts` — add admin route redirect |
| Create | `src/lib/admin.ts` |
| Create | `src/lib/admin-api.ts` |
| Create | `src/app/admin/layout.tsx` |
| Create | `src/app/admin/page.tsx` (placeholder) |
| Create | `src/components/admin/admin-header.tsx` |
| Create | `src/components/admin/admin-sidebar.tsx` |

### Verify
- `npx prisma db push` succeeds
- `npm run type-check && npm run build` passes
- Manually set your user to `role='admin'` in DB
- Navigate to `/admin` — see layout with sidebar. Non-admin users redirected to `/dashboard`

---

## Phase 2: Admin Overview Dashboard

**Goal:** Build the overview page with stat cards and recent activity feed.

### Overview page — `src/app/admin/page.tsx` (REPLACE)

Server Component. Calls `requireAdmin()`, then uses `Promise.all` with Prisma to fetch:
- Total users, total agents (active vs total), submission counts (total + new), active alerts count
- Last 5 of each submission type for the activity feed

### Stat card — `src/components/admin/stat-card.tsx` (NEW)

Reusable component. Props: `label`, `value`, `subValue` (e.g. "3 new"), `href`, `icon`, `accent`. Follow the pattern from `src/app/dashboard/page.tsx:92-125`.

### Recent activity — `src/components/admin/recent-activity.tsx` (NEW)

Client component. Takes pre-fetched submissions as props. Merges and sorts by `createdAt` desc. Each item shows: type badge, name, email, relative time, status badge.

### Files

| Action | File |
|--------|------|
| Replace | `src/app/admin/page.tsx` |
| Create | `src/components/admin/stat-card.tsx` |
| Create | `src/components/admin/recent-activity.tsx` |

### Verify
- Navigate to `/admin` — see stat cards with real counts, activity feed with recent submissions
- `npm run type-check && npm run build` passes

---

## Phase 3: User Management

**Goal:** List, search, filter, and manage users. Admins can change roles.

### Admin user API — `src/app/api/admin/users/route.ts` (NEW)

GET: Paginated user list with search (name/email) and role filter. Uses `requireAdminApi()`.

### Admin user detail API — `src/app/api/admin/users/[id]/route.ts` (NEW)

- GET: Single user with related data counts (favorites, searches, alerts)
- PATCH: Update role. Validate with Zod (`"user" | "agent" | "admin"`). **Prevent self-demotion** (admin cannot remove their own admin role)

### Zod schema — `src/schemas/admin-user.schema.ts` (NEW)

Filter schema (search, role, page, perPage) + role update schema.

### Users page — `src/app/admin/users/page.tsx` (NEW)

Server Component. Fetches initial page of users. Renders `UserManagementTable`.

### User table — `src/components/admin/user-management-table.tsx` (NEW)

Client component. Search input, role filter, data table (Name, Email, Role badge, Joined, Actions), role-change dropdown per row, pagination. Calls admin user API on filter changes.

### User detail page — `src/app/admin/users/[id]/page.tsx` (NEW)

Server Component. Shows profile info, role, activity counts, role-change control.

### Files

| Action | File |
|--------|------|
| Create | `src/app/api/admin/users/route.ts` |
| Create | `src/app/api/admin/users/[id]/route.ts` |
| Create | `src/schemas/admin-user.schema.ts` |
| Create | `src/app/admin/users/page.tsx` |
| Create | `src/components/admin/user-management-table.tsx` |
| Create | `src/app/admin/users/[id]/page.tsx` |

### Verify
- `/admin/users` — see paginated user list, search works, role filter works
- Change a user's role — persists on refresh
- Cannot demote self from admin
- `npm run type-check && npm run build` passes

---

## Phase 4: Agent Management (Mock → DB Migration + CRUD)

**Goal:** Seed agents into DB, replace all mock data imports with Prisma queries, build admin CRUD.

### Step 1: Seed agents

Run `npx prisma db seed` (seed script at `prisma/seed.ts` already upserts from mock data).

### Step 2: Replace mock imports with Prisma

**3 files import from mock agents:**

1. `src/app/api/agents/route.ts` — Replace `filterAgents()` with Prisma `findMany` + `count` with `where` clause for language/letter/search filtering
2. `src/app/(marketing)/agents/page.tsx` — Replace `MOCK_AGENTS`, `AVAILABLE_LANGUAGES`, `filterAgents()` with Prisma queries. Derive `activeLetters` and `availableLanguages` from DB
3. `src/app/(marketing)/agents/[slug]/page.tsx` — Replace `getAgentBySlug()` and `MOCK_AGENTS` with `prisma.agent.findFirst({ where: { slug, active: true } })` and `prisma.agent.findMany({ select: { slug: true } })` for `generateStaticParams`

Also check `src/components/agents/agent-filters.tsx` — this receives data via props (no direct mock import), so no changes needed.

Move `src/data/mock/agents.ts` to `archive/data-mock-agents.ts` (Rule 1: never delete).

### Step 3: Admin agent API

**`src/app/api/admin/agents/route.ts`** (NEW)
- GET: List all agents (including inactive) with pagination, search, active filter
- POST: Create agent. Auto-generate slug from name. Validate with Zod

**`src/app/api/admin/agents/[id]/route.ts`** (NEW)
- GET: Single agent details
- PATCH: Update agent fields. No DELETE — set `active: false` instead

### Zod schema — `src/schemas/admin-agent.schema.ts` (NEW)

Agent create/update schema + filter schema.

### Admin agent pages

- `src/app/admin/agents/page.tsx` (NEW) — Server Component. Agent list with search, active/inactive filter, "Add Agent" button
- `src/components/admin/agent-management-table.tsx` (NEW) — Client component. Table: Photo, Name, Email, Phone, Designations (badges), Status toggle, Edit link
- `src/app/admin/agents/new/page.tsx` (NEW) — Create agent form
- `src/app/admin/agents/[id]/page.tsx` (NEW) — Edit agent form
- `src/components/admin/agent-form.tsx` (NEW) — Shared form component for create/edit. Fields: firstName, lastName, email, phone, photoUrl, bio, languages, designations, active

### Slug utility — add `generateSlug()` to `src/lib/utils.ts`

```ts
export function generateSlug(firstName: string, lastName: string): string {
  return `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
```

### Files

| Action | File |
|--------|------|
| Modify | `src/app/api/agents/route.ts` — Prisma instead of mock |
| Modify | `src/app/(marketing)/agents/page.tsx` — Prisma instead of mock |
| Modify | `src/app/(marketing)/agents/[slug]/page.tsx` — Prisma instead of mock |
| Modify | `src/lib/utils.ts` — add `generateSlug()` |
| Move | `src/data/mock/agents.ts` → `archive/data-mock-agents.ts` |
| Create | `src/app/api/admin/agents/route.ts` |
| Create | `src/app/api/admin/agents/[id]/route.ts` |
| Create | `src/schemas/admin-agent.schema.ts` |
| Create | `src/app/admin/agents/page.tsx` |
| Create | `src/components/admin/agent-management-table.tsx` |
| Create | `src/app/admin/agents/new/page.tsx` |
| Create | `src/app/admin/agents/[id]/page.tsx` |
| Create | `src/components/admin/agent-form.tsx` |

### Verify
- `npx prisma db seed` succeeds — 15 agents seeded
- `/agents` marketing page still works, now reading from DB
- `/agents/[slug]` detail pages still work
- `/admin/agents` — see all agents, create new, edit existing, toggle active
- Grep for `mock/agents` shows zero imports from non-archive files
- `npm run type-check && npm run build` passes

---

## Phase 5: Form Submissions Management

**Goal:** Admin views for contact, home evaluation, and buyer request submissions with filtering, detail views, and status management.

### Submission API

**`src/app/api/admin/submissions/route.ts`** (NEW)
- GET: Query submissions with params: `type` (contact/evaluation/buyer/all), `status` (new/read/archived/all), `search`, `page`, `perPage`
- When `type` is "all", fetch from all 3 tables, merge, sort by `createdAt` desc

**`src/app/api/admin/submissions/[type]/[id]/route.ts`** (NEW)
- GET: Single submission by type and ID
- PATCH: Update status (new/read/archived). Validate with Zod

### Zod schema — `src/schemas/admin-submission.schema.ts` (NEW)

Filter schema + status update schema.

### Submission pages

- `src/app/admin/submissions/page.tsx` (NEW) — Listing page with type tabs, status filter, search
- `src/components/admin/submission-table.tsx` (NEW) — Client component. Type filter tabs, status badges (new=crimson, read=navy, archived=default), search, pagination, status change actions
- `src/app/admin/submissions/contact/[id]/page.tsx` (NEW) — Contact detail view
- `src/app/admin/submissions/evaluation/[id]/page.tsx` (NEW) — Home evaluation detail
- `src/app/admin/submissions/buyer/[id]/page.tsx` (NEW) — Buyer request detail
- `src/components/admin/submission-detail.tsx` (NEW) — Shared detail layout: back link, status controls, field grid

### Files

| Action | File |
|--------|------|
| Create | `src/app/api/admin/submissions/route.ts` |
| Create | `src/app/api/admin/submissions/[type]/[id]/route.ts` |
| Create | `src/schemas/admin-submission.schema.ts` |
| Create | `src/app/admin/submissions/page.tsx` |
| Create | `src/components/admin/submission-table.tsx` |
| Create | `src/app/admin/submissions/contact/[id]/page.tsx` |
| Create | `src/app/admin/submissions/evaluation/[id]/page.tsx` |
| Create | `src/app/admin/submissions/buyer/[id]/page.tsx` |
| Create | `src/components/admin/submission-detail.tsx` |

### Verify
- Submit a contact form on the public site → appears in `/admin/submissions` as "new"
- Mark as read → status updates. Mark as archived → moves to archived filter
- Search by name/email works across all submission types
- Detail pages show all fields for each type
- `npm run type-check && npm run build` passes

---

## Phase 6: Property Alerts Management

**Goal:** Admin view for all property alerts with ability to toggle active/inactive.

### Alerts API

**`src/app/api/admin/alerts/route.ts`** (NEW)
- GET: List all alerts with pagination, search (email/name), active filter. Include linked user info

**`src/app/api/admin/alerts/[id]/route.ts`** (NEW)
- PATCH: Toggle `active` status

### Alerts page

- `src/app/admin/alerts/page.tsx` (NEW) — Server Component
- `src/components/admin/alert-management-table.tsx` (NEW) — Client component. Columns: Email, Name, Cities (badges), Price Range, Beds, Active toggle, Linked User, Created Date

### Files

| Action | File |
|--------|------|
| Create | `src/app/api/admin/alerts/route.ts` |
| Create | `src/app/api/admin/alerts/[id]/route.ts` |
| Create | `src/app/admin/alerts/page.tsx` |
| Create | `src/components/admin/alert-management-table.tsx` |

### Verify
- `/admin/alerts` shows all property alerts
- Toggle active/inactive works
- Search by email works
- `npm run type-check && npm run build` passes

---

## File Inventory (~30 new, ~6 modified)

```
NEW FILES:
  src/lib/admin.ts
  src/lib/admin-api.ts
  src/app/admin/layout.tsx
  src/app/admin/page.tsx
  src/components/admin/admin-header.tsx
  src/components/admin/admin-sidebar.tsx
  src/components/admin/stat-card.tsx
  src/components/admin/recent-activity.tsx
  src/app/api/admin/users/route.ts
  src/app/api/admin/users/[id]/route.ts
  src/schemas/admin-user.schema.ts
  src/app/admin/users/page.tsx
  src/components/admin/user-management-table.tsx
  src/app/admin/users/[id]/page.tsx
  src/app/api/admin/agents/route.ts
  src/app/api/admin/agents/[id]/route.ts
  src/schemas/admin-agent.schema.ts
  src/app/admin/agents/page.tsx
  src/components/admin/agent-management-table.tsx
  src/app/admin/agents/new/page.tsx
  src/app/admin/agents/[id]/page.tsx
  src/components/admin/agent-form.tsx
  src/app/api/admin/submissions/route.ts
  src/app/api/admin/submissions/[type]/[id]/route.ts
  src/schemas/admin-submission.schema.ts
  src/app/admin/submissions/page.tsx
  src/components/admin/submission-table.tsx
  src/app/admin/submissions/contact/[id]/page.tsx
  src/app/admin/submissions/evaluation/[id]/page.tsx
  src/app/admin/submissions/buyer/[id]/page.tsx
  src/components/admin/submission-detail.tsx
  src/app/api/admin/alerts/route.ts
  src/app/api/admin/alerts/[id]/route.ts
  src/app/admin/alerts/page.tsx
  src/components/admin/alert-management-table.tsx

MODIFIED FILES:
  prisma/schema.prisma
  src/middleware.ts
  src/lib/supabase/middleware.ts
  src/lib/utils.ts
  src/app/api/agents/route.ts
  src/app/(marketing)/agents/page.tsx
  src/app/(marketing)/agents/[slug]/page.tsx

MOVED FILES:
  src/data/mock/agents.ts → archive/data-mock-agents.ts
```

---

## Patterns to Reuse

| Pattern | Source | Reuse For |
|---------|--------|-----------|
| Dashboard layout shell | `src/app/dashboard/layout.tsx` | Admin layout |
| Sidebar with icons + active state | `src/components/dashboard/sidebar.tsx` | Admin sidebar |
| Dashboard header | `src/components/dashboard/dashboard-header.tsx` | Admin header |
| StatCard inline component | `src/app/dashboard/page.tsx:92-125` | Admin stat cards |
| AccessDenied component | `src/components/dashboard/access-denied.tsx` | Admin access denied |
| Zod + API route pattern | `src/app/api/contact/route.ts` | All admin API routes |
| cn() utility | `src/lib/utils.ts` | All components |
| Prisma singleton | `src/lib/prisma.ts` | All server queries |
| Agent filter API pattern | `src/app/api/agents/route.ts` | Admin agent/user list APIs |

---

## Bootstrap: First Admin User

After Phase 1 is deployed, run this SQL to promote yourself:

```sql
UPDATE "UserProfile" SET role = 'admin' WHERE email = 'robspeciale@gmail.com';
```

Or via Prisma:
```bash
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.userProfile.update({ where: { email: 'robspeciale@gmail.com' }, data: { role: 'admin' } })
  .then(u => console.log('Updated:', u.email, '→', u.role))
  .finally(() => p.\$disconnect());
"
```
