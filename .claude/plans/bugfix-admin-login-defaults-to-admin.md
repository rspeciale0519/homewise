# Bugfix: Admins Log In to /admin

## Goal

Align login-redirect behavior with the stated rules:

1. Admins land on `/admin` after login (not `/dashboard` or `/dashboard/agent-hub`).
2. Agents land on `/dashboard/agent-hub` (already correct — no change).
3. Only admins can switch between `/admin` and `/dashboard/agent-hub` (already correct via the user-menu Switch View section).

## Non-Goals

- No change to the Switch View menu.
- No change to agent routing.
- No DB migration — `UserProfile.defaultDashboardView` column is left in place (harmless) and simply stops being read.

## Phase 1 — Redirect admins to /admin and archive the preference UI

1. **`src/lib/dashboard-view.ts`**:
   - Add `ADMIN_DASHBOARD_PATH = "/admin"`.
   - Simplify `resolveDashboardPath`: `agent` → agent hub; `admin` → `/admin`; else → client.
   - Remove `DASHBOARD_VIEWS`, `DashboardView`, `isDashboardView`, `DASHBOARD_VIEW_PATHS` — now unused.
   - Keep `DEFAULT_DASHBOARD_PATH` for the hook's fallback.
2. **Settings page**:
   - `src/app/dashboard/settings/page.tsx` — drop the Dashboard Preferences card and its data fetch; keep Security + Danger Zone.
3. **Archive**:
   - Move `src/app/dashboard/settings/dashboard-preference.tsx` and `dashboard-preference-actions.ts` to `archive/2026-04-21-admin-dashboard-preference/` per Rule 1.
4. **Verify all callers still type-check**:
   - `/auth/callback` — unchanged import; still calls `resolveDashboardPath`.
   - `/api/me/dashboard-view` — unchanged.
   - `useDashboardHref` — unchanged.
   - `login-form.tsx` — unchanged.
5. **Prisma schema**: leave `defaultDashboardView` field in place with a deprecation comment so a future cleanup PR can drop it if desired.

**Checkpoint 1:** `/git-workflow-planning:checkpoint 1 admins log in to admin and remove preference card`

## Phase 2 — Finish

`/git-workflow-planning:finish` → PR against `develop`, merge, promote `develop` → `main`, verify Vercel builds.

## Manual smoke test (phase 1, before checkpoint)

- Sign in as admin with preference = `client` → lands on `/admin`.
- Sign in as admin with preference = `agent` → lands on `/admin`.
- Sign in as agent → still lands on `/dashboard/agent-hub`.
- Sign in as regular user → still lands on `/dashboard`.
- Explicit `?redirectTo=/properties` still wins.
- Admin clicks "Dashboard" in user menu → navigates to `/admin`.
- Admin clicks "Switch View → Agent" → navigates to `/dashboard/agent-hub` (unchanged).
- Admin clicks "Switch View → Admin Panel" → navigates to `/admin` (unchanged).
- `/dashboard/settings` no longer shows the Dashboard Preferences card for admins.

## Files touched

**Modified:**
- `src/lib/dashboard-view.ts`
- `src/app/dashboard/settings/page.tsx`
- `prisma/schema.prisma` (deprecation comment only)

**Archived (per Rule 1):**
- `src/app/dashboard/settings/dashboard-preference.tsx`
- `src/app/dashboard/settings/dashboard-preference-actions.ts`
