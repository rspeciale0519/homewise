# Document Library Card Grid — Design

**Date:** 2026-04-12
**Scope:** `src/app/dashboard/agent-hub/documents` (Document Library page only)
**Out of scope:** Resources Hub (`/dashboard/agent-hub`) — unchanged

## Problem

On the Document Library page, document cards inside each category render as a 1-column vertical stack (`grid gap-2` with no column count), making each card stretch the full width of the content area. This reads as too wide on desktop viewports.

## Goal

Render document cards in a multi-column grid where the number of columns adapts fluidly to the viewport width, matching the visual density of the Resources Hub cards.

## Decision

Use CSS Grid auto-fill with `minmax()` — continuous reflow, no breakpoint jumps.

**Minimum card width:** `300px`, chosen to match the per-card width of the Resources Hub Quick Access grid (3 cols inside a ~976px content area on a 1280px viewport ≈ 315px per card).

## Change

One file: `src/components/content/document-list.tsx`.

1. Replace the inner grid wrapper:

   ```tsx
   // Before
   <div className="grid gap-2">

   // After
   <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
   ```

2. Add `line-clamp-2` to the document description `<p>` so row heights stay tidy when descriptions vary in length:

   ```tsx
   <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
     {doc.description}
   </p>
   ```

No changes to card markup, icons, hover states, links, or category section headers.

## Behavior

| Viewport width (content area) | Columns |
| --- | --- |
| < ~600px | 1 |
| ~600–900px | 2 |
| ~900–1200px | 3 |
| 1200px+ | 4 |

Columns reflow continuously as the viewport resizes.

## Verification

- `npm run type-check` — passes
- `npm run lint` — passes
- Playwright MCP: load `/dashboard/agent-hub/documents` as an agent, switch between Office / Listing / Sales tabs, resize viewport and confirm column count adapts; confirm Resources Hub page is unchanged.
