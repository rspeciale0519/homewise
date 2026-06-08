---
type: skill
status: established
confidence: high
updated: 2026-06-07
sources:
  - transcript:2026-05-26
  - code:src/components/admin/documents-organize
---

# dnd-kit drag overlay that tracks the cursor

## When to use
Building or debugging any `@dnd-kit` draggable in homewise (document organize boards,
section cards, bulk drag-to-categorize), especially when the `DragOverlay` preview renders
offset from the cursor.

## The approach
1. **`setNodeRef` and `listeners` MUST be on the SAME element.** dnd-kit measures the
   cursor's offset *within the `setNodeRef` element* and preserves that ratio when placing
   the overlay. Put both on the small grip handle (~36px), not on a wide row.
2. For **whole-card drag** (grab anywhere): put drag attributes on the row root, add
   `stopPropagation` on `onPointerDown` of inner action buttons (Categorize/Edit/Delete),
   and use a `PointerSensor` with ~5px **activation distance** so taps on the checkbox/body
   don't start a drag.
3. Center the preview on its container with CSS: `absolute left-1/2 top-1/2
   -translate-x-1/2 -translate-y-1/2` on the `BulkDragPreview` itself.
4. Keep toolbars/selection strips a **fixed height** (size to the tallest child) so they
   don't reflow when a selection appears.

## Pitfalls & anti-patterns
- Root cause of the classic "overlay ~560px from cursor" bug: `setNodeRef` on the
  ~800px-wide row but `listeners` on the right-edge grip → dnd-kit thinks the cursor is at
  x≈760 of an 800px element and offsets the 224px overlay to match.
- `snapCenterToCursor` (`@dnd-kit/modifiers`) was a **no-op** here — the handle container
  was already centered; the real problem was the child preview overflowing inside it. Don't
  trust a plausible-looking modifier fix.
- **Verify with a programmatic mid-drag screenshot**: dispatch pointer events, pause
  mid-drag, capture coordinates. A container can be correctly positioned while its child
  overflows — only pixel measurement (container center vs cursor) isolates it.

## Evidence
Transcript 2026-05-26 (bulk drag-categorize). Pattern reused consistently across section
cards and rows; shipped PR #39/#43/#45/#47/#49.

## Revision log
- 2026-06-07 — created from transcript backfill; established (pattern applied across
  multiple components/PRs).
