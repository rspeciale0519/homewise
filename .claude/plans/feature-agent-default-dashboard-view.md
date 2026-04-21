# Feature: Agent Default Dashboard View

## Goal

Agents land on `/dashboard/agent-hub` by default — both after login (when no explicit `redirectTo`) and when clicking any "Dashboard" menu button — instead of the client `/dashboard` view they currently see.

## Non-Goals

- No new setting for agents (toggling is unnecessary; admins keep theirs).
- Regular users (`role === "user"`) still default to `/dashboard`.

## Phase 1 — Update `resolveDashboardPath` and ship

1. **`src/lib/dashboard-view.ts`** — extend `resolveDashboardPath` so:
   - `role === "admin"` → resolve via stored `defaultDashboardView` (unchanged).
   - `role === "agent"` → return `DASHBOARD_VIEW_PATHS.agent` (`/dashboard/agent-hub`).
   - Any other role (including `null` / missing) → `DEFAULT_DASHBOARD_PATH` (`/dashboard`).
2. No UI changes — the agent flow already calls the helper on login and in the nav hook, so the fix propagates automatically.
3. Manual smoke test:
   - Agent user signs in without `?redirectTo=` → lands on `/dashboard/agent-hub`.
   - Agent clicks "Dashboard" menu button → navigates to `/dashboard/agent-hub`.
   - Explicit `?redirectTo=/properties` still wins.
   - Non-agent non-admin user → unchanged `/dashboard` behavior.

**Checkpoint 1:** `/git-workflow-planning:checkpoint 1 agent role defaults to agent hub`

## Phase 2 — Finish

`/git-workflow-planning:finish`

## Files touched

**Modified:**
- `src/lib/dashboard-view.ts`
