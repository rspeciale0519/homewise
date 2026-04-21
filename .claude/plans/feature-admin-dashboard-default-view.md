# Feature: Admin Default Dashboard View Preference

## Goal

Allow Admin users to choose whether their "default" dashboard view is the Client dashboard (`/dashboard`) or the Agent dashboard (`/dashboard/agent-hub`). The preference applies:

1. Immediately after login (redirect target when no explicit `?redirectTo=` is present)
2. Whenever the admin clicks any "Dashboard" menu button (desktop user menu + mobile nav)

Only admins see and use this preference. Regular users and agents retain today's hardcoded `/dashboard` behavior.

## Non-Goals

- Does **not** change routes or dashboards for non-admin users
- Does **not** add a per-device or cookie-only preference (uses DB so it persists across devices)
- Does **not** affect the Admin console (`/admin`) — that remains accessible via its own link
- Does **not** touch the `/dashboard/billing` admin view (already fixed separately)

## Constants

```ts
// Central constant module
export const DASHBOARD_VIEWS = ["client", "agent"] as const;
export type DashboardView = (typeof DASHBOARD_VIEWS)[number];

export const DASHBOARD_VIEW_PATHS: Record<DashboardView, string> = {
  client: "/dashboard",
  agent: "/dashboard/agent-hub",
};
```

Location: `src/lib/dashboard-view.ts` (new).

## Phase 1 — Data model + helper

1. **Prisma schema** — add field to `UserProfile`:
   ```prisma
   defaultDashboardView String @default("client")
   ```
2. **Migration** — `prisma migrate dev --name add_default_dashboard_view` (names must match Supabase pooler workflow per Rule 8). Run via session-mode pooler (`DIRECT_DATABASE_URL` at port 5432).
3. **Helper module** — `src/lib/dashboard-view.ts`:
   - `DASHBOARD_VIEWS`, `DashboardView`, `DASHBOARD_VIEW_PATHS` (above)
   - `resolveDashboardPath(profile: { role: string; defaultDashboardView: string } | null)` → returns `/dashboard` for non-admins, returns the mapped path for admins, falls back to `/dashboard` if value is unrecognized.
4. **Zod** — extend any user-profile update schema that currently accepts partial profile updates to also accept `defaultDashboardView: z.enum(DASHBOARD_VIEWS).optional()`.

**Checkpoint 1:** `/git-workflow-planning:checkpoint 1 add default dashboard view field and helper`

## Phase 2 — Settings UI (admin-only card)

1. **Server page** — extend `src/app/dashboard/settings/page.tsx`:
   - Fetch profile (`role`, `defaultDashboardView`) in addition to current data.
   - When `role === "admin"`, render a new "Dashboard Preferences" card above the Security section.
2. **Client component** — new `src/app/dashboard/settings/dashboard-preference.tsx`:
   - Two-option segmented control (Client / Agent).
   - Uses a form action calling a new server action `updateDashboardView(view: DashboardView)`.
   - Optimistic UI + toast on success.
3. **Server action** — `src/app/dashboard/settings/dashboard-preference-actions.ts`:
   - Auth check (`role === "admin"`), Zod validate, update `UserProfile.defaultDashboardView`, `revalidatePath("/dashboard/settings")`.

**Checkpoint 2:** `/git-workflow-planning:checkpoint 2 settings UI and action for dashboard preference`

## Phase 3 — Login redirect path resolution

1. **`src/app/auth/callback/route.ts`**:
   - After `exchangeCodeForSession` resolves, if `redirectTo` is the default `"/dashboard"` (i.e., caller did not supply an explicit override), look up the user's profile and resolve via `resolveDashboardPath()`.
   - If the caller **did** supply `?redirectTo=`, honor it as-is (non-default wins).
2. **`src/components/auth/login-form.tsx`**:
   - Keep the current `redirectTo` behavior for explicit overrides.
   - After `signInWithPassword` succeeds, if no explicit `redirectTo` query param was present, fetch the user's profile via the existing supabase client + a thin `/api/me/dashboard-view` endpoint (server-side, fast) and redirect accordingly. Fallback to `/dashboard` on any error.
3. **New API route** — `src/app/api/me/dashboard-view/route.ts`:
   - `GET` returns `{ path: string }` resolved via `resolveDashboardPath()` for the authed user. Used by the login form.

**Checkpoint 3:** `/git-workflow-planning:checkpoint 3 apply default view on login redirect`

## Phase 4 — Navigation "Dashboard" link resolution

Admins see a resolved href for every "Dashboard" menu button. Non-admins are unaffected.

1. **Desktop user menu** — `src/components/layout/user-menu.tsx`:
   - Accept a `dashboardHref` prop from its server-rendered parent, defaulting to `/dashboard`.
   - Replace the two hardcoded `/dashboard` hrefs (lines 11 & 105) with this prop.
2. **Mobile nav** — `src/components/layout/mobile-nav.tsx`:
   - Same pattern: accept `dashboardHref`, replace the hardcoded link (line 151).
3. **Render path** — trace the server component that renders the header/nav (likely `src/app/layout.tsx` or a `site-header.tsx`):
   - Look up profile (`role`, `defaultDashboardView`) once per request, pass the resolved href down via props.
4. **Agent-sidebar “Back to Site” / other `/dashboard` links** — out of scope (they link to the marketing site, not the dashboard).

**Checkpoint 4:** `/git-workflow-planning:checkpoint 4 wire admin dashboard href through nav`

## Phase 5 — Verification + roadmap + finish

1. Run `npm run type-check` and `npm run lint` (expected clean).
2. Manual smoke test via Playwright/Chrome DevTools:
   - Log in as admin with preference `"client"` → lands at `/dashboard`.
   - Flip preference to `"agent"` in Settings → "Dashboard" menu button now routes to `/dashboard/agent-hub`.
   - Log out, log back in → lands at `/dashboard/agent-hub`.
   - Login URL containing `?redirectTo=/properties` still respects the explicit override.
   - Log in as a non-admin (role = "user" or "agent") → classic `/dashboard` behavior unchanged.
3. Update `docs/Development_Roadmap.md` (Rule 7) — mark the feature complete if a matching entry exists; otherwise skip per the standard prompt.
4. `/git-workflow-planning:finish`

## Files touched

**New:**
- `src/lib/dashboard-view.ts`
- `src/app/dashboard/settings/dashboard-preference.tsx`
- `src/app/dashboard/settings/dashboard-preference-actions.ts`
- `src/app/api/me/dashboard-view/route.ts`
- `prisma/migrations/<timestamp>_add_default_dashboard_view/`

**Modified:**
- `prisma/schema.prisma`
- `src/app/dashboard/settings/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/components/auth/login-form.tsx`
- `src/components/layout/user-menu.tsx`
- `src/components/layout/mobile-nav.tsx`
- Whichever server component renders `<UserMenu />` and `<MobileNav />` (discovered during Phase 4)

## Risk / Open Questions

- **Agent users with `defaultDashboardView = "client"`**: currently admins only. If we later want agents to get this toggle, the helper already handles it — the settings UI just gates rendering.
- **Explicit `redirectTo=/dashboard`**: because this string equals the default, we treat it as "use preference." Acceptable tradeoff — if callers need a hard "Client dashboard" redirect, they can use `?redirectTo=/dashboard/overview` style alternative (no such route exists today, so this is non-blocking).
