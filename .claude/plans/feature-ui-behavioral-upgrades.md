# UI Behavioral Upgrades — 6 Targeted Fixes

## Context

The site's visual design is solid and brand-correct. The gaps are behavioral and accessibility:
no focus traps in modals, native `<select>` limiting styling/keyboard nav, custom click-outside detection
in menus, no lightbox for photo gallery, and a fragile toast system. This plan swaps the behavioral engine
under 6 components using Radix UI primitives + Sonner — keeping all existing brand styling intact.

**No call-site changes required** for any fix. All prop APIs stay identical.

---

## Packages to Install (Gate — run first)

```bash
npm install @radix-ui/react-alert-dialog @radix-ui/react-select @radix-ui/react-dropdown-menu @radix-ui/react-dialog sonner tailwindcss-animate --legacy-peer-deps
```

## tailwind.config.ts (one edit before agents run)

Add to top-level imports:
```ts
import animate from "tailwindcss-animate";
```
Add to `plugins` array:
```ts
plugins: [typography, animate],
```

---

## Phase 1: All 6 Fixes

### Fix 1 — confirm-dialog.tsx → @radix-ui/react-alert-dialog
### Fix 2 — admin-toast.tsx → Sonner
### Fix 3 — select.tsx → @radix-ui/react-select
### Fix 4 — user-menu.tsx → @radix-ui/react-dropdown-menu
### Fix 5 — mobile-nav.tsx → @radix-ui/react-dialog
### Fix 6 — photo-gallery.tsx → Embla + Radix Dialog Lightbox

## Verification

1. `npm run type-check` — zero errors
2. `npm run lint` — zero errors
3. `npm run build` — succeeds
