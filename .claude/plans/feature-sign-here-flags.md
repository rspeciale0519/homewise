# Feature: Sign-Here Flags

## Context

Adds a third annotation type to the document viewer (`/dashboard/documents/viewer`) alongside existing Custom Text and Signature annotations. Flags are colored sticky-tab markers (DocuSign-style) that the agent places on a document to tell the customer where to sign or initial.

Capabilities:

1. **Place** — click the flag toolbar tool, then click the document. Sticky mode (stays active for multiple placements).
2. **Move** — drag the body of any flag to reposition.
3. **Select** — single click in cursor mode shows resize/rotate handles + selection toolbox.
4. **Resize** — proportional, four corner handles, scale 0.5–2.5.
5. **Rotate** — free rotation via top handle, snap when within ±5° of any cardinal.
6. **Recolor** — six fixed colors, both per-flag (via selection toolbox) and global default (via toolbar swatch).
7. **Relabel** — Sign / Initial / Date / Witness / Custom (≤12 chars).
8. **Delete** — toolbox button, or Delete/Backspace while selected.
9. **Persist** — flags round-trip through draft persistence; default color persists in localStorage.
10. **Export** — flattened into the page on every export path (download/print/email).

**Design spec:** `docs/superpowers/specs/2026-04-26-sign-here-flags-design.md`

**Branch:** `feature/sign-here-flags` (created off `develop` via `/git-workflow-planning:start`)

---

## Architecture Overview

### Data model

Discriminated union on `type`. Existing `Annotation` becomes:

```ts
type Annotation = TextAnnotation | SignatureAnnotation | FlagAnnotation;
```

`FlagAnnotation` carries `pdfX`/`pdfY` (notch tip), `label` (string), `color` (enum), `rotation` (degrees), `scale` (number).

### Default-color persistence

LocalStorage key `homewise.documentViewer.flagDefaultColor` holds a single `FlagColor` string. Read on shell mount, written when the toolbar swatch picker commits. Zod-validated; corrupt data falls back to `"yellow"`. Mirrors the pattern in `text-defaults.ts`.

### Rendering

Single SVG per flag (body + notch as one `<path>`) so rotation pivots the whole silhouette around the notch tip cleanly. Selection chrome (handles + connector line + toolbox) is sibling DOM, also positioned via the overlay's coordinate math.

### Export

`pdf-merger.ts` adds a `drawFlag` helper that emits a vector path at the flag's transformed coordinates. Same flatten policy applies — the on-disk PDF is always flat; the editable layer lives in the draft state already maintained by `pdf-viewer-shell`.

---

## Phase 1 — Data model, schema, color/defaults helpers

**Goal:** Type system understands flag annotations end to end. No UI yet.

**Tasks:**

- `src/types/document-viewer.ts`:
  - Add `FlagColor` union and `FlagAnnotation` interface.
  - Update `Annotation` to be a discriminated union including the new flag shape.
  - Refactor existing `Annotation` interface into named `TextAnnotation` and `SignatureAnnotation` types as needed.
- `src/schemas/document-viewer.schema.ts`:
  - Add `flagColorSchema` (Zod enum of 6 colors).
  - Add `flagAnnotationSchema` for the flag shape (`type: z.literal("flag")`, label `z.string().max(64)`, color enum, rotation `z.number().min(0).lt(360)`, scale `z.number().min(0.5).max(2.5)`).
  - Convert `annotationSchema` to a `z.discriminatedUnion("type", […])`.
- `src/lib/documents/flag-colors.ts` (new):
  - Export `FLAG_COLORS` (ordered array of 6 keys), `DEFAULT_FLAG_COLOR = "yellow"`, `flagColorHex(color)` helper, `flagColorLabel(color)` for a11y.
  - Export `FLAG_LABEL_PRESETS = ["Sign", "Initial", "Date", "Witness"] as const` and `MAX_CUSTOM_LABEL_LENGTH = 12`.
- `src/lib/documents/flag-defaults.ts` (new):
  - SSR-safe `readFlagDefaultColor()` and `writeFlagDefaultColor(color)` mirroring `text-defaults.ts`.
- Audit existing reads of `annotation.type` to confirm they handle the new `"flag"` discriminant safely (default branches return null / no-op).

**Verification:** `npm run type-check`, `npm run lint`. No tests yet.

**Checkpoint:** `/git-workflow-planning:checkpoint 1 flag data model schema and helpers`

---

## Phase 2 — Flag renderer (presentation only)

**Goal:** Pure component that renders a flag at a given anchor with rotation/scale. No interaction yet.

**Tasks:**

- `src/components/documents/flag-renderer.tsx` (new):
  - Props: `flag: FlagAnnotation`, `pageDimensions` (for PDF→screen coord conversion), optional `selected` and `onPointerDown` for later phases.
  - Render an absolutely-positioned `<svg>` whose `viewBox` covers the body + notch. Single `<path>` for the silhouette, `<text>` for the label.
  - Width and height computed from the base 96×24 × `flag.scale`.
  - `transform: translate(...) rotate(...)` with the notch tip at the transform origin.
  - White label text, 11pt × `scale`, centered in the body region of the path.
  - `aria-label="Sign-here flag, <color>, label '<label>'"`.
- Add `FlagRenderer` to the page-renderer's render pipeline behind a feature gate that's still off (just to verify it compiles into the tree without breaking anything).

**Verification:**
- `npm run type-check`, `npm run lint`.
- Unit-render a flag via the dev server in a stub: drop one fake `FlagAnnotation` into the overlay state and confirm it renders at the expected screen position.

**Checkpoint:** `/git-workflow-planning:checkpoint 2 flag renderer component`

---

## Phase 3 — Toolbar mode + click-to-place (no selection yet)

**Goal:** Agent can enter flag mode and drop flags on the page. No selection, resize, rotate, recolor, or relabel yet — just placement and rendering.

**Tasks:**

- `src/components/documents/viewer-toolbar.tsx`:
  - Add a new "Flag" tool button after Place text. Heroicons `flag` outline, h-4 w-4, strokeWidth 1.5.
  - Add `activeMode === "flag"` to the existing tool-mode switching pattern.
  - Add a default-color swatch button next to the flag tool, **only rendered when `activeMode === "flag"`**. Click opens a 6-swatch popover; selection updates the default and persists via `writeFlagDefaultColor`.
- `src/components/documents/annotation-overlay.tsx`:
  - Add a `"flag"` branch to the click handler: on click in flag mode, compute PDF coordinates and call a new `onCreateFlagAnnotation(pageIndex, pdfX, pdfY)` prop.
  - Iterate `annotations.filter(a => a.type === "flag")` and render via `FlagRenderer`.
- `src/components/documents/pdf-page-renderer.tsx`:
  - Pass `onCreateFlagAnnotation` through.
- `src/app/dashboard/documents/viewer/pdf-viewer-shell.tsx`:
  - Track `flagDefaultColor` in state; load from localStorage on mount.
  - `handleCreateFlagAnnotation` emits a new `FlagAnnotation` with current `flagDefaultColor`, label `"Sign"`, rotation 0, scale 1, and pushes through `addAnnotation`. Stay in flag mode (sticky).
  - `handleSetFlagDefaultColor` updates state + persists.

**Verification:**
- Browser: enter flag mode, click document, confirm a yellow "Sign" tab appears at the click point. Click again → another tab. Switch the toolbar swatch to blue → next placed tab is blue.
- `npm run type-check`, `npm run lint`.

**Checkpoint:** `/git-workflow-planning:checkpoint 3 flag mode click to place`

---

## Phase 4 — Selection state + selection toolbox + delete

**Goal:** Click a placed flag to select it; show a navy outline + toolbox with color swatches, label dropdown, delete button. Click outside / Escape to deselect. Delete/Backspace removes.

**Tasks:**

- `src/components/documents/flag-selection-toolbox.tsx` (new):
  - Props: `flag`, `anchor` (overlay-relative position above the flag), `onChangeColor(color)`, `onChangeLabel(label)`, `onDelete()`, `onClose()`.
  - Layout: rounded-xl, white, `shadow-dropdown`, `border-slate-100`, p-2, h-12.
  - Row contents: 6 small color swatches (ring on selected) | divider | label `<select>` showing the four presets + "Custom…" | divider | trash icon button.
  - "Custom…" reveals a 12-char input; commit on blur/Enter, cancel on Escape.
  - All interactive children `e.stopPropagation()` + `e.preventDefault()` on `onMouseDown` (matches the existing `AnnotationToolbox` pattern).
- `src/components/documents/annotation-overlay.tsx`:
  - Track `selectedFlagId` alongside the existing selected-text state.
  - Click on a flag → set `selectedFlagId` + render the selection toolbox.
  - Click outside / Escape → clear selection.
  - Delete / Backspace while selected → call `onDeleteAnnotation(id)`.
  - Pass through `onUpdateAnnotation` for color/label edits.
- `src/components/documents/flag-renderer.tsx`:
  - When `selected`, render a 1px navy-600 outline rect that hugs the rotated bounding box.

**Verification:**
- Browser: place a flag, click it, confirm outline + toolbox. Pick a color → flag color changes; default unchanged in the toolbar. Pick "Initial" → label updates. Click trash → removed. Escape and Delete keys also work.
- `npm run type-check`, `npm run lint`.

**Checkpoint:** `/git-workflow-planning:checkpoint 4 flag selection and toolbox`

---

## Phase 5 — Drag-to-move

**Goal:** Drag the body of any flag to move it. 3px threshold so a click doesn't accidentally drag.

**Tasks:**

- `src/components/documents/flag-renderer.tsx`:
  - On pointerdown: capture the pointer, record initial PDF coords, set a `dragging` ref.
  - On pointermove: if movement exceeds 3px, mark drag started; emit live `onDrag(deltaPdfX, deltaPdfY)` so the overlay can render at the live position without committing.
  - On pointerup: commit the new `pdfX`/`pdfY` via `onUpdateAnnotation`. Below threshold = treat as click (for selection).
- `src/components/documents/annotation-overlay.tsx`:
  - Hold a temporary `draggingFlag` state to render the flag at the in-flight position. Commit on release.

**Verification:**
- Browser: drag selected and unselected flags. Confirm a quick click still selects (no inadvertent move). Confirm position commits in draft after release.
- `npm run type-check`, `npm run lint`.

**Checkpoint:** `/git-workflow-planning:checkpoint 5 flag drag to move`

---

## Phase 6 — Resize + rotate handles

**Goal:** Selected flag shows four corner resize handles + rotate handle; both work with the documented constraints.

**Tasks:**

- `src/components/documents/flag-renderer.tsx`:
  - When `selected`, render four corner handles (10×10 white squares, 1px navy-600 border) on the rotated bounding box.
  - Render a rotate handle (14×14 round, white, navy-600 border) 24px above the top-center, connected by a 1px slate-300 line.
- Resize logic:
  - Pointer-down on a corner → enter resize mode. Use the diagonal distance from center as the scale reference. Apply `clamp(scale, 0.5, 2.5)` live.
  - On release, commit `scale`.
- Rotate logic:
  - Pointer-down on the rotate handle → enter rotate mode. Track angle from flag center to pointer. Subtract initial pointer angle so the rotation is relative.
  - Snap: if `Math.abs(angle - cardinal) <= 5` for any cardinal, snap to that cardinal and flash the handle navy-600.
  - On release, commit `rotation`.
- All handle pointer events `e.stopPropagation()` so they don't trigger drag-move.

**Verification:**
- Browser: drag corners — flag scales proportionally, capped at bounds. Drag rotate handle — free rotation; release near a cardinal → snaps. Both gestures persist after deselect/reselect.
- `npm run type-check`, `npm run lint`.

**Checkpoint:** `/git-workflow-planning:checkpoint 6 flag resize and rotate`

---

## Phase 7 — Server-side PDF embedding

**Goal:** `pdf-merger.ts` draws flags on every export path; recipient sees them flattened in the PDF.

**Tasks:**

- `src/lib/documents/pdf-merger.ts`:
  - `drawFlag(page, flag)` helper:
    - Translate to `(flag.pdfX, flag.pdfY)`.
    - Apply `degrees(flag.rotation)`.
    - Draw the silhouette as a path (rounded body rectangle + notch triangle) with `flagColorHex(flag.color)` fill.
    - Draw the label using the existing Helvetica `pdf-lib` standard font (no new font assets — flags only ever use the system font for v1). White fill, 11pt × scale, centered.
  - Iterate flags in the annotations array after text and signature passes (so flags z-order on top).
- Make sure rotation handling matches the browser: the browser pivots around the notch tip, so the server transform must do the same.

**Verification:**
- Browser: place flags with mixed rotations/scales/colors/labels. Trigger Email export → received PDF has all flags rendered at the right positions, sizes, rotations, and colors. Trigger Download export → same. Open the downloaded PDF in a non-Homewise viewer → flags are part of the page (flat).
- `npm run type-check`, `npm run lint`.

**Checkpoint:** `/git-workflow-planning:checkpoint 7 server side flag rendering`

---

## Phase 8 — Keyboard polish + final QA

**Goal:** Arrow-key nudge, edge-case verification, accessibility cleanup.

**Tasks:**

- `src/components/documents/annotation-overlay.tsx`:
  - When a flag is selected: ArrowLeft/Right/Up/Down nudges 1px in PDF coords; Shift+Arrow nudges 10px.
- `src/components/documents/flag-renderer.tsx`:
  - Add `aria-selected` when selected. Confirm the focusable element has visible focus styling.
- `src/components/documents/flag-selection-toolbox.tsx`:
  - Confirm tab order is logical; trap focus inside the toolbox while it's open; Escape returns focus to the flag.
- Manual QA pass:
  - Save a doc with flags → close → reopen → flags reappear identically.
  - Multi-page document: place flags on pages 1 and 3; switch pages; confirm only the active page's flags render.
  - Heavy stress: 20 flags on a page; confirm no perf regression on drag/select.

**Verification:**
- `npm run type-check`, `npm run lint`, `npm run test` (no new tests required, but existing must stay green).
- Lighthouse a11y score on the viewer page should not regress.

**Checkpoint:** `/git-workflow-planning:checkpoint 8 keyboard polish and final qa`

---

## Phase 9 — PR

Run `/git-workflow-planning:finish`.

PR title: `feat: sign-here flags`
PR body: phase commit summary + test plan.

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| Rotation math drifts between browser and server | Single shared helper or matched constants; rotate-around-notch-tip explicit in both. |
| Drag jitter on slow machines (large PDFs) | Throttle the live drag emission via `requestAnimationFrame`. |
| Flags stored in stale drafts before this PR fail to deserialize after rollout | Discriminated union default branch returns `undefined` → annotation is skipped, not crashed. (No live drafts in the wild today contain flag annotations, so this is theoretical.) |
| Customer's PDF viewer (Apple Preview / Chrome PDF) renders the flattened flag oddly | Flatten to plain vector graphics — universally supported. Verify on Preview, Chrome, Adobe Reader during phase 7. |

## Out of Scope

- Free-aspect resize, custom hex colors, multi-select, recipient-side click-to-sign, save-as-template — all explicitly deferred per the design spec.
