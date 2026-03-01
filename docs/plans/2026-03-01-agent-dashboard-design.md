# Agent Dashboard Design

## Problem

The Agent Resources section (company identifiers, 53 PDF forms, quick-access documents) is currently publicly accessible at `/agent-resources`. This exposes internal brokerage materials — Tax IDs, HUD NAID numbers, compliance forms, branded templates, and proprietary transaction workflows — to anyone, including buyers, sellers, and search engine crawlers.

## Solution

Create an **Agent Tools** section within the existing authenticated user dashboard, gated by a new `"agent"` role. Remove the public Agent Resources pages entirely. Protect PDF files behind an authenticated API route.

## Architecture

### Role-Based Access via Invite Code

- New environment variable: `AGENT_INVITE_CODE` (e.g., `HWAGENT2026`)
- Registration page detects `?code=XXXX` query parameter
- If the code matches `AGENT_INVITE_CODE`, the new `UserProfile` is created with `role: "agent"` instead of the default `"user"`
- The registration page displays a subtle "Agent Registration" badge when a valid code is present
- The brokerage includes the coded registration link in agent onboarding emails
- The code is rotatable by changing the environment variable — no redeploy of code required

### Integrated Dashboard Sidebar

The existing user dashboard sidebar (`src/components/dashboard/sidebar.tsx`) becomes role-aware:

```
┌────────────────────────┐
│   DASHBOARD            │
│                        │
│   Overview             │
│   Favorites            │
│   Saved Searches       │
│   Recently Viewed      │
│   Profile              │
│   My Agent             │
│   Settings             │
│                        │
│  ────────────────────  │  ← Only visible when role === "agent"
│   AGENT TOOLS          │
│                        │
│   Resources Hub        │
│   Document Library     │
│                        │
│  ────────────────────  │
│   ← Back to Site       │
└────────────────────────┘
```

- The dashboard layout fetches the user's `role` from Prisma and passes it to the sidebar
- If `role === "agent"`, the "Agent Tools" section renders below a divider
- On mobile, agent items appear in the horizontal scroll tab bar after user items
- Non-agent users never see the agent section

### Dashboard Pages

Two new pages under `/dashboard/agent-hub`:

**Resources Hub** (`/dashboard/agent-hub`)
- Company identifiers: HUD NAID, Tax ID, DBPR License, ORRA MLS Office ID
- Office phone and fax
- Quick-access documents (5 pinned items)
- Links to document categories
- Transaction Desk informational callout

**Document Library** (`/dashboard/agent-hub/documents`)
- All 53 forms from all 3 categories (Office, Listing, Sales) on a single page
- Tabbed or accordion navigation between categories
- Each document row: name, description, download link
- Search/filter capability (optional future enhancement)

### PDF Protection

Currently, all PDFs live in `public/documents/` and are directly accessible by URL. This must change:

- **Move** all PDFs from `public/documents/` to `private/documents/` (outside Next.js public directory)
- **New API route:** `GET /api/documents/[...path]`
  - Validates Supabase session from cookies
  - Queries `UserProfile` to confirm `role === "agent"`
  - Streams the requested file from `private/documents/`
  - Returns 401 (no session) or 403 (wrong role)
  - Sets appropriate `Content-Type` and `Content-Disposition` headers
- **Update** all document URLs in `src/data/content/agent-resources.ts` from `/documents/...` to `/api/documents/...`

### Navigation Cleanup

- **Remove** "Agent Resources" from `NAV_ITEMS` in `src/data/navigation.ts`
- **Archive** the 4 public marketing pages (per Rule 1 — move to `archive/`, do not delete):
  - `src/app/(marketing)/agent-resources/page.tsx`
  - `src/app/(marketing)/agent-resources/listing-forms/page.tsx`
  - `src/app/(marketing)/agent-resources/sales-forms/page.tsx`
  - `src/app/(marketing)/agent-resources/office-forms/page.tsx`
- Agent content is only accessible through the authenticated dashboard

### Access Denied Handling

- If a non-agent user navigates to `/dashboard/agent-hub`, the page checks `role` server-side and renders an "Agent access required" message with office contact information
- Unauthenticated users are redirected to `/login` by existing middleware

## Data Flow

```
Agent onboarding email
  → homewisefl.com/register?code=HWAGENT2026
  → Registration form (shows "Agent Registration" badge)
  → Supabase auth.signUp() + UserProfile created with role="agent"
  → Redirect to /dashboard
  → Sidebar shows "Agent Tools" section
  → /dashboard/agent-hub (Resources Hub)
  → /dashboard/agent-hub/documents (Document Library)
  → Download link → GET /api/documents/office/transaction-checklist.pdf
  → API validates session + role → streams file
```

## What Changes

| Item | Before | After |
|------|--------|-------|
| Agent Resources pages | Public at `/agent-resources/*` | Archived; content moved to `/dashboard/agent-hub/*` |
| PDFs | Public at `/documents/*` | Private, served via `/api/documents/*` with auth |
| Header nav | Shows "Agent Resources" to everyone | "Agent Resources" removed from public nav |
| Dashboard sidebar | Same for all users | Role-aware: agents see "Agent Tools" section |
| Registration | All users get `role: "user"` | `?code=` param assigns `role: "agent"` |

## What Stays the Same

- All existing user dashboard functionality (favorites, saved searches, profile, etc.)
- Dashboard layout shell, header, styling
- Auth flow (Supabase + middleware + layout guard)
- Data file structure (`agent-resources.ts`) — only URL paths change
- Shared components (`DocumentList`, `Container`, `CtaBanner`)

## Environment Variables

```bash
# New
AGENT_INVITE_CODE=HWAGENT2026    # Rotatable, not hardcoded
```

## File Inventory (Estimated)

**New files (~6):**
- `src/app/dashboard/agent-hub/page.tsx` — Resources Hub page
- `src/app/dashboard/agent-hub/documents/page.tsx` — Document Library page
- `src/app/api/documents/[...path]/route.ts` — Authenticated PDF streaming
- `private/documents/` — moved PDFs (office/, listing/, sales/ subdirectories)

**Modified files (~5):**
- `src/components/dashboard/sidebar.tsx` — Add role-aware Agent Tools section
- `src/app/dashboard/layout.tsx` — Pass role to sidebar
- `src/data/navigation.ts` — Remove Agent Resources from NAV_ITEMS
- `src/data/content/agent-resources.ts` — Update document URLs
- `src/app/(marketing)/register/page.tsx` (or register-form) — Handle invite code
- `.env.local` / `.env.example` — Add AGENT_INVITE_CODE

**Archived files (4):**
- `src/app/(marketing)/agent-resources/page.tsx`
- `src/app/(marketing)/agent-resources/listing-forms/page.tsx`
- `src/app/(marketing)/agent-resources/sales-forms/page.tsx`
- `src/app/(marketing)/agent-resources/office-forms/page.tsx`
