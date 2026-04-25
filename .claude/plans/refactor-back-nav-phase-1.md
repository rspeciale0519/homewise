# Refactor: Back Navigation — Phase 1 (High-Priority Pages)

## Problem

When a user opens a document from the Documents page (admin or agent dashboard), the document detail/viewer page shows a "← Documents" back button. Clicking it returns the user to the Documents page **with the default tab selected**, even if the user originally selected a different category tab. The same class of issue exists across other key pages (contacts, property search) where filters / search state are silently dropped on back-navigation.

## Goal

All "back" buttons must return the user to the page they were on prior — preserving tab selection, filters, search query, and pagination.

## Scope (Phase 1 only)

Phase 1 ships first so the user can verify the behavior before we touch the rest of the app. Phase 2 (admin agents/users/billing/campaigns, training, agents directory, calculators, learning center, 404) ships separately in a later PR.

Phase 1 covers these pages:

| Page | Back button | Parent state to preserve |
|---|---|---|
| `/dashboard/documents/viewer` (Agent Hub) | "← Documents" in `viewer-toolbar.tsx` | tab + search on `/dashboard/agent-hub/documents` |
| Admin documents organize view | (no back button — this is the parent; needs URL state lifting) | tab + search inside `/admin/documents` |
| `/admin/contacts/[id]` | "← Back to Contacts" | search/stage/source/type/page (already URL-driven, just needs preserved) |
| `/properties/[id]` (marketing) | "Back to Search" | search query + filters (already URL-driven, just needs preserved) |

## Root cause

Two distinct sub-problems:

1. **Local state instead of URL state.** Tabs on `/dashboard/agent-hub/documents` (DocumentTabs) and `/admin/documents` (OrganizeView) are stored in `useState`, so even if the back button perfectly returns to the parent URL, the freshly-mounted parent renders its default tab. Lifting tab + search into URL query params (`?tab=...&q=...`) makes the parent URL itself capture the user's view.

2. **Hard-coded `<Link href>` back buttons.** When the back link points to a fixed parent URL, any URL state on that parent is overwritten on click. Replacing those with a smart back component that calls `router.back()` (with a fallback href for direct deep-link visits) makes the browser walk back to the exact prior URL, query params and all.

Both fixes are required together: lifting state without `router.back()` only helps if the user reloaded; using `router.back()` without lifting state only helps if there was URL state to begin with.

## Implementation

### Phase A — Build shared `<BackButton>` component

**New file:** `src/components/ui/back-button.tsx`

- Client component
- Props: `fallbackHref: string`, `label?: string` (default `"Back"`), `className?: string`, `iconClassName?: string`
- Behavior on click:
  - If browser history has more than the current entry (`window.history.length > 1`) AND there's a same-origin referrer (`document.referrer` is empty OR `new URL(document.referrer).origin === window.location.origin`), call `router.back()`
  - Otherwise, `router.push(fallbackHref)` — handles direct deep-link visits (refresh, copy/paste URL)
- Renders a left-arrow SVG + label, matches the existing slate-500/navy-700 styling used in `viewer-toolbar.tsx` so we can drop it in without visual regression

### Phase B — Lift documents view state to URL

**`/dashboard/agent-hub/documents/document-tabs.tsx`** (client component)

- Replace `useState` for `active` index with `useSearchParams()` reading `tab` query param
- Map `?tab=office|listing|sales` to the right tab; default to first tab when missing or invalid
- On tab click, call `router.replace(\`?tab=\${tabKey}\`, { scroll: false })` so tab changes don't pollute history (user clicking tab A then tab B then a doc should back-nav to tab B, which `replace` gives us)
- Document-row clicks still `push` to the viewer (existing behavior in `DocumentList`)

**`/admin/documents/organize-view.tsx`** (client component)

- Replace `useState` for `activeTab` and `search` with URL-driven state (`?tab=...&q=...`)
- Use `useSearchParams()` for reads
- On tab change or search change, `router.replace` with new query string, `{ scroll: false }`
- Debounce search-param updates (~250ms) so we don't write a query string on every keystroke
- `preview` mode stays as local state (it's an admin-only inline toggle, not navigation-relevant)

### Phase C — Update high-priority back buttons

1. **`src/components/documents/viewer-toolbar.tsx`** (line 94-102)
   - Replace `<Link href="/dashboard/agent-hub/documents">` with `<BackButton fallbackHref="/dashboard/agent-hub/documents" label="Documents" />`
   - Keep mobile icon-only behavior (likely via `label` prop made optional + responsive class, or a small wrapper)

2. **`src/app/admin/contacts/[id]/page.tsx`** (line 52-54)
   - Replace `<Link href="/admin/contacts">← Back to Contacts</Link>` with `<BackButton fallbackHref="/admin/contacts" label="Back to Contacts" />`
   - Note: this page is a server component. `<BackButton>` is a client component, which is fine to drop into a server component.

3. **`src/app/(marketing)/properties/[id]/page.tsx`** (line 211)
   - The current "Back to Search" lives inside a `<CtaBanner>`. Inspect the CtaBanner API:
     - If it accepts a custom button slot, render `<BackButton fallbackHref="/properties" label="Back to Search" />`
     - If it only accepts `{ label, href }`, replace the CtaBanner usage for this CTA with a styled `<BackButton>` wrapper or extend CtaBanner to accept a `customAction` slot
   - We'll favor the smallest change that doesn't ripple into other CtaBanner usages

### Phase D — Verify

- `npm run type-check`
- `npm run lint`
- Start dev server (or use existing)
- Manual chrome-devtools MCP browser walkthrough:
  1. Sign in as agent → Documents → click "Listing" tab → click a document → click back → confirm "Listing" tab is still active
  2. Repeat as admin: Admin → Documents → "Sales" tab → search for a doc → click viewer (if applicable) → back → confirm tab + search both restored
  3. Admin → Contacts → set search/stage filter → click a contact → back → confirm filter still applied
  4. Properties (marketing) → search → click a property → "Back to Search" → confirm query + filters preserved
- Watch console for errors; report results

## Non-goals (deferred to Phase 2)

- Admin agents, users, billing, campaigns back buttons (no user-facing state on parent pages — low priority)
- Training hub + course/lesson back buttons
- Marketing agents directory + agent profile back buttons
- Calculators, learning center, 404 page back buttons
- Any agent-form `Cancel` buttons (these are form-cancel semantics, not navigation)

## Risks / open questions

- `useSearchParams()` triggers Suspense boundary requirement in Next.js App Router. If `DocumentTabs` is dynamic without Suspense above it, may need `<Suspense>` wrap or `dynamic = 'force-dynamic'` config. Will verify during implementation.
- `CtaBanner` API may not have a custom-button slot; if not, we widen the API minimally rather than fork the component.
- Mobile icon-only documents back button — make sure `<BackButton>` supports the existing responsive class `hidden sm:inline` on the label.

## Acceptance criteria

- All four back buttons in scope use the shared `<BackButton>`
- Documents page tab + search are URL-driven
- Manual flow walkthrough confirms tab/filter/search preservation across back navigation
- Type-check and lint pass clean
- PR is opened on `refactor/back-nav-phase-1` branch for user testing before Phase 2 work begins
