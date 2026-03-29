# Pricing Page Redesign — Design Spec

> **Date:** 2026-03-28
> **Status:** Approved
> **Scope:** UI-only refactor of the pricing page layout and interaction

## Changes

### 1. Membership: Full card → Slim banner
Convert the large membership card into a compact horizontal banner that sits above the bundle cards. Always visible but not dominating. Shows: icon, name, key features summary, $499/year price.

### 2. Bundle card order
Reorder from [AI Power Tools, Marketing Suite, Growth Engine] to [Marketing Suite, AI Power Tools (center, "Most Popular"), Growth Engine].

### 3. Tab toggle: Bundles vs Build Your Own
Add a tab toggle between the membership banner and the cards:
- **Bundles tab** (default): 3 bundle cards with "Add to Plan" / "Selected" toggle
- **Build Your Own tab**: Individual features grouped by category (AI, Marketing, Growth) with per-feature checkboxes and prices. Each category shows a "Tip: Bundle all for $X/mo" nudge.

### 4. Card selection UX
- **Unselected:** Gray border, "Add to Plan" gray button, no badge
- **Selected:** Crimson border + glow shadow, crimson checkmark badge top-right corner, button becomes crimson "Selected" with checkmark. Click again to deselect.

### 5. Sticky bottom checkout bar
Fixed to viewport bottom. Shows:
- Selected items as colored pills (e.g., "Membership $499/yr" + "AI Power Tools $49/mo")
- Running total (e.g., "$148/mo + $499/yr")
- "Subscribe & Checkout" crimson button
- Only visible when the page has selections (membership is always implied)

### 6. Remove old add-ons section
The old add-ons grid below bundles is replaced by the "Build Your Own" tab. FAQ section remains.

## Files to Modify
- `src/components/pricing/pricing-page.tsx` — Major rewrite (layout, tabs, sticky bar)
- `src/components/pricing/bundle-card.tsx` — Selection state UX updates
- `src/components/pricing/addon-card.tsx` — Remove (replaced by Build Your Own)
- Create: `src/components/pricing/feature-picker.tsx` — Build Your Own tab content
