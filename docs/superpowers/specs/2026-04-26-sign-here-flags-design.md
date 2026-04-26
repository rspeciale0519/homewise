# Sign-Here Flags — Design

**Date:** 2026-04-26
**Status:** Approved (pending implementation plan)
**Scope:** Document viewer (`/dashboard/documents/viewer`)

---

## 1. Goal

Give the agent a way to mark **where the customer should sign or initial** on a document. Flags are visible in the viewer, baked into the exported PDF the customer receives, and easy for the agent to place, recolor, rotate, resize, and remove.

The chosen visual is the industry-standard **sticky tab** (DocuSign / Adobe Sign style): a small colored tab with a rounded body and a triangular notch pointing at the spot.

## 2. Annotation Anatomy

Each flag is a colored tab roughly **96×24px** at default scale, composed of:

- A rounded rectangular **body** displaying a short label.
- A triangular **notch** on the leading edge (right by default) pointing at the click point.
- A solid background color from the user's palette; label text is rendered in white at a contrast-checked weight.

Default label: `"Sign"`. Default rotation: 0° (notch points right). Default color: whatever the user last picked (yellow on first ever use).

## 3. Label Model

Fixed presets plus one free-text option:

| Preset    | Notes                                  |
|-----------|----------------------------------------|
| Sign      | Default                                |
| Initial   |                                        |
| Date      |                                        |
| Witness   |                                        |
| Custom…   | Free text input, max 12 chars, trimmed |

Custom labels persist as plain strings on the annotation; storage shape allows any string, but the picker UI offers only the four presets and the custom input.

## 4. Geometry & Manipulation

### 4.1 Placement

- Toolbar gains a **Flag** icon button (Heroicons `flag` outlined, h-4 w-4, strokeWidth=1.5) immediately after Place text.
- Clicking the button activates **flag mode** (sticky — stays active until the user exits with Escape or clicks the cursor tool).
- A click on the document creates a new flag at that point with the current default color, the default label `"Sign"`, rotation 0°, scale 1.0.

### 4.2 Movement

- Single click on an unselected flag → selects it (no movement on a click that doesn't drag).
- Mouse-down on the body of any flag (selected or not) followed by mouse movement past a 3px threshold → drag begins; the flag is also selected if it wasn't already.
- Snaps to nearest 1px in PDF coordinates; no grid snap.
- While dragging, the cursor changes to `grabbing`. Release commits the new `pdfX`/`pdfY`.

### 4.3 Selection model

- Single click on a flag in cursor mode → selects it. Selected state shows:
  - 1px navy-600 outline around the flag's bounding box.
  - **Four corner resize handles** (small white squares with navy border, ~10×10px).
  - **One rotate handle** floating ~24px above the top-center of the flag, connected by a thin slate-300 line. Round (~14×14px, 4px larger than resize handles), white fill with navy-600 1px border.
  - **Selection toolbox** docked above the rotate handle, containing: 6 color swatches, a label dropdown, a delete button. Same visual language as the existing `AnnotationToolbox` (rounded-xl, white, `shadow-dropdown`, `border-slate-100`).
- Click outside the flag (and outside its toolbox) → deselects.
- Escape while selected → deselects.
- Backspace/Delete while selected → deletes the flag.

### 4.4 Resize

- Proportional only. Dragging any corner scales uniformly around the flag's center.
- Bounds: minimum scale 0.5 (≈48×12px), maximum 2.5 (≈240×60px). Scale is stored as a single number; width/height derive from base dimensions × scale.
- Cursor reflects which corner is being dragged (`nwse-resize` / `nesw-resize`).

### 4.5 Rotate

- Drag the rotate handle around the flag's center. Free rotation, 0°–360°, normalized.
- **Snap-on-near-cardinal:** if the rotation is within ±5° of 0°, 90°, 180°, or 270°, snap to that cardinal. Visual cue: handle briefly turns navy-600 to indicate snap engaged.
- Rotation is applied via CSS `transform: rotate()` in the browser, and as a `degrees(...)` rotation in `pdf-lib` on export.

## 5. Color Palette

Six fixed colors, chosen for legibility on white paper and distinguishability for color-blind users (verified against the Coblis simulator at design time):

| Key      | Hex       | Use                |
|----------|-----------|--------------------|
| yellow   | `#f59e0b` | Default            |
| blue     | `#2563eb` |                    |
| green    | `#16a34a` |                    |
| red      | `#dc2626` |                    |
| purple   | `#7c3aed` |                    |
| orange   | `#ea580c` |                    |

The label color is always white (`#ffffff`).

### 5.1 Default-color UX

The user's default color is **whatever they last picked from the toolbar's swatch row** (i.e. the per-flag picker doubles as the default-setter):

- The toolbar shows a small swatch button reflecting the current default.
- Clicking it opens a 6-swatch popover; selecting a color sets the default and applies it to the next flag placed.
- Changing an *individual* selected flag's color via its toolbox does **not** alter the default. Only changes made via the toolbar swatch do.
- The default is persisted to `localStorage` under `homewise.documentViewer.flagDefaultColor` with a Zod-validated read/write helper, mirroring `text-defaults.ts`.

## 6. Data Model

New annotation type `flag` added to the existing union in `src/types/document-viewer.ts`:

```ts
export type FlagColor = "yellow" | "blue" | "green" | "red" | "purple" | "orange";

export interface FlagAnnotation {
  id: string;
  type: "flag";
  pageIndex: number;
  pdfX: number;       // anchor (notch tip) in PDF coordinates
  pdfY: number;
  label: string;      // "Sign" | "Initial" | "Date" | "Witness" | <custom string>
  color: FlagColor;
  rotation: number;   // degrees, 0–359
  scale: number;      // 0.5–2.5
}
```

The existing `Annotation` union becomes `TextAnnotation | SignatureAnnotation | FlagAnnotation`. Existing code that branches on `type === "text" | "signature"` adds a `"flag"` case; anywhere it falls through (e.g. `default: return null`) remains safe.

`annotationSchema` in `src/schemas/document-viewer.schema.ts` gains a discriminated union with the flag shape and a `flagColorSchema` enum.

Drafts (auto-save and explicit save) include flag annotations transparently — they go through the same `annotations` array.

## 7. Client-Side Rendering

A new `FlagRenderer` component renders a single flag:

- Path/SVG for the body+notch shape (one `<svg>` so the notch and body are a single coherent silhouette; no separate `<div>` arrow).
- Width and height derive from `scale`. Position uses `transform: translate(x, y) rotate(deg)` with the notch tip at the origin so rotation always pivots around the tip.
- Pointer event handling on the body for drag-to-move; pointer event handling on the four corner handles + rotate handle when selected.
- `aria-label` reflects the label and color: `"Sign-here flag, blue"`.

`AnnotationOverlay` adds a `flag` branch to its render switch. Selection state is local to the overlay (already manages a `selectedAnnotationId` for text). The flag's selection toolbox is a new sibling to the existing `AnnotationToolbox`, positioned via the same anchor-and-flip math.

## 8. Server-Side PDF Embedding

`pdf-merger.ts` (existing module that handles export) gains a `drawFlag(page, flag)` helper:

- Translate to `(flag.pdfX, flag.pdfY)` (PDF coordinate flip already handled there).
- Apply `degrees(flag.rotation)`.
- Draw the body as a rounded rectangle path (using `pdf-lib`'s `drawRectangle` + manual notch path via `drawSvgPath` since `pdf-lib` supports SVG path strings).
- Embed the label text using the same Helvetica `pdf-lib` standard font already used by the export path. White fill, 11pt at scale 1.0, scaled proportionally.
- Z-order: flags draw **after** text and signature annotations, so they sit on top of any underlying form content. They draw **before** any final flatten pass.

### 8.1 Flatten policy

Flags follow the existing flatten policy already defined for other annotations: the on-disk PDF is flattened in every export path (download, print, email), so any external viewer renders the flags as static page content. The agent's ability to re-edit a previously-saved document comes from re-loading the draft state from our backend (which holds the structured `FlagAnnotation[]`), not from parsing the PDF. This matches how text and signature annotations already round-trip today: the PDF is always flat; the editable layer lives in the draft.

## 9. Toolbar Changes

New entries on `viewer-toolbar.tsx`:

1. **Flag mode toggle** — icon button after Place text. Active state matches existing tool buttons (navy-50 background, navy-700 icon).
2. **Default-color swatch** — small circular swatch button to the right of the flag toggle, only visible while flag mode is active. Click opens the 6-swatch palette.

No changes to the existing cursor / signature / Place text / Insert field buttons.

## 10. Keyboard

| Key                 | Behavior                                                |
|---------------------|---------------------------------------------------------|
| Click flag tool     | Enter flag mode (sticky)                                |
| Escape (in flag mode) | Exit to cursor mode                                   |
| Click flag (cursor mode) | Select                                             |
| Escape (selected)   | Deselect                                                |
| Delete / Backspace (selected) | Delete the flag                               |
| Arrow keys (selected) | Nudge 1px (PDF coords); Shift+Arrow nudges 10px       |

## 11. Out of Scope (for v1)

- Free aspect-ratio resize (banner-shaped flags).
- Custom hex colors / brand color matching.
- Multi-select and group operations.
- Per-flag opacity / drop shadow customization.
- Recipient-side interactivity (clicking the flag in a PDF viewer to start signing) — flags are visual instructions only.
- Saving placement templates / "remember the layout for this form".

## 12. Components Summary

New / changed files:

| File                                                              | Change   |
|-------------------------------------------------------------------|----------|
| `src/types/document-viewer.ts`                                    | Modify   |
| `src/schemas/document-viewer.schema.ts`                           | Modify   |
| `src/lib/documents/flag-defaults.ts`                              | New      |
| `src/lib/documents/flag-colors.ts`                                | New      |
| `src/components/documents/flag-renderer.tsx`                      | New      |
| `src/components/documents/flag-selection-toolbox.tsx`             | New      |
| `src/components/documents/annotation-overlay.tsx`                 | Modify   |
| `src/components/documents/viewer-toolbar.tsx`                     | Modify   |
| `src/app/dashboard/documents/viewer/pdf-viewer-shell.tsx`         | Modify   |
| `src/lib/documents/pdf-merger.ts`                                 | Modify   |

## 13. Acceptance Criteria

1. Agent enters flag mode, clicks four times on a page → four "Sign" tabs in the current default color appear at those points.
2. Agent selects a tab → corner handles + rotate handle + selection toolbox appear; clicking outside deselects.
3. Drag a corner → tab scales proportionally within bounds.
4. Drag the rotate handle past the snap zone → free rotation; release within ±5° of a cardinal → snaps cleanly.
5. Open the label dropdown on a selected tab → choosing "Initial" updates the body text without losing position/rotation/color.
6. Pick "Custom…" → input field accepts up to 12 chars; commit updates the tab.
7. Toolbar swatch click → palette opens; pick blue → next placed tab is blue; existing tabs are unchanged.
8. Selected tab → press Delete → tab disappears.
9. Email export → recipient receives a PDF with all tabs flattened into the page; no editable annotation layer.
10. Download export → re-opening in our viewer → all tabs reappear in their original positions, colors, labels, rotations, and scales.
11. Annotation save/load round-trips a flag through the draft persistence layer with no data loss.
