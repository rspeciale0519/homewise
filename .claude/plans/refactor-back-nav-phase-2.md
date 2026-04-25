# Refactor: Back Navigation — Phase 2 (Remaining Pages)

## Goal

Phase 1 (#29) verified the `<BackButton>` + `useBackHandler` pattern on the four highest-priority pages. Phase 2 applies the same pattern to the remaining 12 back buttons identified in the original audit.

## Branching

Branch off `refactor/back-nav-phase-1` (Phase 1's branch) since `develop` does not yet contain `<BackButton>`. When PR #29 merges, this PR rebases cleanly onto develop.

## Scope (12 buttons)

### Admin section (5)

| File | Current | Replace with |
|---|---|---|
| `src/app/admin/agents/[id]/page.tsx` | `<Link href="/admin/agents">` "Back to Agents" | `<BackButton fallbackHref="/admin/agents" label="Back to Agents" />` |
| `src/app/admin/agents/new/page.tsx` | `<Link href="/admin/agents">` "Back to Agents" | same as above |
| `src/app/admin/users/[id]/page.tsx` | `<Link href="/admin/users">` "Back to Users" | `<BackButton fallbackHref="/admin/users" label="Back to Users" />` |
| `src/app/admin/billing/agents/[id]/page.tsx` | `<Link href="/admin/billing/agents">` "Back to Agent Billing" | `<BackButton fallbackHref="/admin/billing/agents" label="Back to Agent Billing" />` |
| `src/app/admin/campaigns/[id]/page.tsx` | `<Link href="/admin/campaigns">` "← Back to Campaigns" | `<BackButton fallbackHref="/admin/campaigns" label="Back to Campaigns" />` |

Plus the agent form's Cancel button:

| File | Current | Replace with |
|---|---|---|
| `src/components/admin/agent-form.tsx` | `onClick={() => router.back()}` (no fallback) | `onClick={useBackHandler('/admin/agents')}` — keeps Cancel semantics, gains deep-link fallback |

### Marketing section (3)

| File | Current | Replace with |
|---|---|---|
| `src/app/(marketing)/agents/[slug]/page.tsx` | `<Link href="/agents">` "Back to Agent Directory" | `<BackButton fallbackHref="/agents" label="Back to Agent Directory" />` |
| `src/app/(marketing)/agents/[slug]/listings/page.tsx` | `<Link href="/agents/${slug}">` "Back to {fullName}'s profile" (only when no listings) | `<BackButton fallbackHref={\`/agents/\${slug}\`} label={\`Back to \${fullName}'s profile\`} />` — fallbackHref is dynamic per agent |
| `src/app/(marketing)/learn/[slug]/page.tsx` | `<Link href="/learn">` "← Back to Learning Center" | `<BackButton fallbackHref="/learn" label="Back to Learning Center" />` |

### Dashboard section (2)

| File | Current | Replace with |
|---|---|---|
| `src/app/dashboard/training/courses/[id]/page.tsx` | `<Link href="/dashboard/training">` "Back to Training Hub" | `<BackButton fallbackHref="/dashboard/training" label="Back to Training Hub" />` |
| `src/app/dashboard/training/[slug]/page.tsx` | `<Link href="/dashboard/training">` "Back to Training Hub" + breadcrumb to course | first link → `<BackButton>`; second link (breadcrumb to course) stays a `<Link>` because it's forward navigation, not back |

### Misc (2)

| File | Current | Replace with |
|---|---|---|
| `src/components/calculators/calculator-shell.tsx` | `<Link href="/mortgage-calculator">` "Back to Calculators" | `<BackButton fallbackHref="/mortgage-calculator" label="Back to Calculators" iconClassName="w-3.5 h-3.5" className="text-xs text-crimson-600 hover:text-crimson-700" />` — needs custom styling to match existing calculator-shell visual treatment |
| `src/app/not-found.tsx` | `<Button>Back to Home</Button>` | Keep as-is or convert to `<BackButton>`. Decision: keep as a Link to home — "Back to Home" semantically means "go to home page", not "go back in history". This is a navigation CTA, not a back affordance. **Skip this one.** |

## Non-changes

- The breadcrumb chip on `/dashboard/agent-hub/documents` ("Resources Hub" link) is forward navigation to the parent route, not a back button. Skip.
- `<Header>` etc. component logo links etc. — out of scope.
- Any "Cancel" buttons in modal/drawer flows — those are local UI close actions, not nav back. Skip.

## Implementation

### Phase A — Admin section (5 buttons + 1 cancel)

Mechanical Link → BackButton swap. Server components stay server components (BackButton is a client component dropped in). For `agent-form.tsx`, replace the `() => router.back()` onClick with the `useBackHandler('/admin/agents')` hook.

### Phase B — Marketing + dashboard + calculators (6 buttons)

Same mechanical swap. The agents/[slug]/listings page builds `fallbackHref` from the dynamic agent slug. The calculator-shell needs custom styling to match the existing crimson + smaller chevron look.

## Verification

- `npm run type-check`
- `npm run lint`
- Targeted browser walkthroughs (chrome-devtools MCP):
  - `/agents` directory → click an agent → "Back to Agent Directory" → verify URL params (if any) preserved
  - `/dashboard/training` → click a course → "Back to Training Hub" → verify history-based back works
  - `/mortgage-calculator/mortgage` → "Back to Calculators" → returns to `/mortgage-calculator`
  - `/admin/agents` → click an agent → "Back to Agents" → returns
- Push, monitor Vercel deploy until green

## Acceptance criteria

- 11 back buttons replaced with `<BackButton>` (12 minus the not-found page which stays as-is)
- 1 Cancel button on agent-form uses `useBackHandler` instead of bare `router.back()`
- Type-check and lint pass
- PR opened, Vercel deploy green
