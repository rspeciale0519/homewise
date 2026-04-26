# Feature: Custom Text — Re-edit, Font Picker, Font Size

## Context

Builds on the existing Custom Text annotation feature in the document viewer (`/dashboard/documents/viewer`). Users can drop inline text annotations on any PDF; this feature adds three things:

1. **Re-edit** — double-click a placed annotation to edit its text inline.
2. **Font picker** — five fonts (Helvetica, Times, Roboto, Georgia, Verdana) that render identically in the browser preview and the exported PDF.
3. **Font size picker** — hybrid input + preset dropdown (8/10/12/14/16/18/24/36 pt; free entry 6–96).

Picker UI lives in a new floating `AnnotationToolbox` component shown both during edit and when an annotation is selected (cursor mode). Last-used font + size become sticky defaults via localStorage.

**Design spec:** `docs/superpowers/specs/2026-04-26-custom-text-edit-fonts-design.md`

**Branch:** `feature/custom-text-edit-fonts` (created off `develop` via `/git-workflow-planning:start`)

---

## Architecture Overview

### Library additions

| Library | Purpose | Install |
|---------|---------|---------|
| `@pdf-lib/fontkit` | Embed TTF fonts into PDF for export | `npm install @pdf-lib/fontkit` |

### Font assets

Three TTFs live under `public/fonts/annotations/`:

- `Roboto-Regular.ttf` — Apache-2.0, no licensing concerns.
- `Georgia-Regular.ttf` — license verification before ship.
- `Verdana-Regular.ttf` — license verification; fallback to `DejaVu-Sans-Regular.ttf` (BSD-style) if redistribution is unclear.

Browser uses the static URL via `@font-face`. Server reads the same files via `fs.readFile(path.join(process.cwd(), "public/fonts/annotations/<name>"))`.

### Data model

Add `fontFamily?: AnnotationFontFamily` to the `Annotation` type. `undefined` is treated as `"Helvetica"`. Both browser and server respect the field; export schema adds enum validation.

### Sticky defaults

LocalStorage key `homewise.documentViewer.textDefaults` holds `{ fontFamily, fontSize }`. Read on shell mount, written on every commit. Validated with Zod; corrupt JSON falls back silently.

---

## Phase 1 — Foundation: inline-editor + Custom Text rename

**Status:** Already implemented in working tree (uncommitted on `main`); this phase folds the changes onto the feature branch as the foundation.

**Files modified:**
- `src/components/documents/annotation-overlay.tsx` — inline `<input>` editor on text-mode click, commit on Enter/blur, cancel on Escape.
- `src/components/documents/annotation-placer.tsx` — "Free Text" tab renamed "Custom Text"; input + Place button replaced with hint text.
- `src/components/documents/viewer-toolbar.tsx` — drop obsolete `onPlaceText` / `pendingPlacement` props.
- `src/app/dashboard/documents/viewer/pdf-viewer-shell.tsx` — drop popover-driven text path; add `onCreateTextAnnotation` callback.
- `src/components/documents/pdf-page-renderer.tsx` — pass new callback through.

**Verification:** lint + type-check clean; manual inline-edit test in browser already passed.

**Checkpoint:** `/git-workflow-planning:checkpoint 1 inline editor and custom text rename`

---

## Phase 2 — Data model and schema

**Goal:** Annotation type carries `fontFamily`; schemas validate it; client and server have one source of truth.

**Tasks:**
- `src/types/document-viewer.ts` — add `AnnotationFontFamily` union and optional `fontFamily` field on `Annotation`.
- `src/schemas/document-viewer.schema.ts` — extend annotation Zod schema with `fontFamily` enum (`.optional()`), update any nested schemas (drafts, export request).
- `src/lib/documents/fonts.ts` (new) — export `AnnotationFontFamily` constants, default `"Helvetica"`, `fontFamilyCss(family)` helper, font display labels.
- Spot-fix all existing reads of `annotation.value` / `annotation.fontSize` to also pass `fontFamily` where rendered.

**Verification:** `npm run type-check`, `npm run lint`. Tests don't change yet.

**Checkpoint:** `/git-workflow-planning:checkpoint 2 add fontFamily to data model and schema`

---

## Phase 3 — Font assets and CSS

**Goal:** Fonts load in the browser; the same files are reachable from the server.

**Tasks:**
- License-check Georgia and Verdana; if either fails, swap to DejaVu Sans for that slot before adding files.
- Add TTFs under `public/fonts/annotations/`.
- Create `src/styles/annotation-fonts.css` with `@font-face` declarations (font-display: swap; UTF-8 unicode-range).
- Import the new CSS once from `src/app/layout.tsx`.
- Confirm browser loads the fonts via DevTools network tab.

**Verification:** Hardcode an annotation in the viewer with `fontFamily: "Roboto"` (temporary debug) and confirm visual change. Revert before checkpoint.

**Checkpoint:** `/git-workflow-planning:checkpoint 3 add font assets and font-face declarations`

---

## Phase 4 — `AnnotationToolbox` component (frontend-design)

**Goal:** Polished, accessible floating mini-toolbar with font dropdown + size combobox. **Built via the `frontend-design` skill** so it gets a deliberate visual treatment that matches the rest of the viewer.

**Component contract:**
```ts
interface AnnotationToolboxProps {
  fontFamily: AnnotationFontFamily;
  fontSize: number;
  anchor: { left: number; top: number };
  targetWidth: number;
  onChange(next: { fontFamily?: AnnotationFontFamily; fontSize?: number }): void;
  onClose?: () => void;
}
```

**Tasks:**
- Invoke `/frontend-design` to design and build `src/components/documents/annotation-toolbox.tsx`.
- Constraints supplied to the skill:
  - Width ~240 px; font dropdown 140 px, size combobox 60 px, plus padding/separators.
  - Each font option labeled in its own typeface for live preview.
  - Size combobox accepts arbitrary integer 6–96 plus presets `[8, 10, 12, 14, 16, 18, 24, 36]`.
  - Auto-positions above anchor; flips below if anchor.top is too close to overlay top; clamps to overlay bounds.
  - Pointer events isolated (`onMouseDown stopPropagation`) so clicking the toolbox does not deselect.
  - Stays focus-stable: changing font/size does not steal focus from the inline editor.
  - Visual language matches existing viewer toolbar (slate/navy/crimson palette already in use).

**Verification:** Storybook-style local mount (or unit-render test) before integration — confirm dropdown opens, size input clamps, change events fire.

**Checkpoint:** `/git-workflow-planning:checkpoint 4 build annotation toolbox component`

---

## Phase 5 — Selection + double-click edit integration

**Goal:** Wire `AnnotationToolbox` into `AnnotationOverlay`; implement single-click select and double-click re-edit.

**Tasks:**
- `annotation-overlay.tsx`:
  - Add `selectedTextId: string | null` to overlay state for text annotations.
  - Single-click in cursor mode on a text annotation → select it. Show selection ring + drag/resize handles + `AnnotationToolbox`.
  - Double-click in cursor mode on a text annotation → enter edit mode. Reuse the existing draft state, expanded with `mode: "create" | "edit"`, `annId: string | null`, `fontFamily`, `fontSize`.
  - Hide the original `<span>` while it's being edited (avoid double-rendering).
  - On commit (Enter/blur):
    - `mode === "edit"` → call new prop `onUpdateAnnotation(id, patch)`. Empty value → call `onDeleteAnnotation(id)`.
    - `mode === "create"` → call existing `onCreateTextAnnotation` with current font/size from draft.
  - On Escape → discard draft state (no mutation).
  - Render `AnnotationToolbox` if a text annotation is selected (cursor mode) OR draft exists. Anchor it above the active target.
- `pdf-viewer-shell.tsx`:
  - Add `handleUpdateAnnotation(id, patch)` and `handleUpdateAnnotationStyle(id, partial)` callbacks.
  - Plumb through `pdf-page-renderer.tsx` and `annotation-overlay.tsx`.
- Update `onCreateTextAnnotation` signature to accept font/size from the draft so the new annotation persists the chosen style.

**Verification:** Manual test in browser:
1. Place a custom text annotation with default style — appears in Helvetica 12.
2. Single-click it — selection ring + toolbox appear.
3. Change font/size in toolbox — annotation re-renders live.
4. Double-click it — text becomes editable; toolbox stays.
5. Edit, press Enter — content + style persist.
6. Empty + Enter → annotation deleted.
7. Escape mid-edit → no change.

**Checkpoint:** `/git-workflow-planning:checkpoint 5 wire selection and double-click edit`

---

## Phase 6 — Sticky defaults

**Goal:** Last-used font/size carries across drafts and across page reloads.

**Tasks:**
- `src/lib/documents/text-defaults.ts` (new) — Zod-validated read/write helpers for the localStorage key.
- `pdf-viewer-shell.tsx`:
  - Read defaults on mount; expose via context or pass-through prop.
  - Write defaults whenever `handleCreateTextAnnotation` or `handleUpdateAnnotation` commits with a non-default style (or always — simpler).
- New drafts initialize their toolbox state from defaults.

**Verification:**
- Place an annotation in Roboto 18.
- Place another — toolbox starts at Roboto 18 (not Helvetica 12).
- Reload — same.
- Manually corrupt the localStorage key — viewer still loads, defaults fall back to Helvetica 12.

**Checkpoint:** `/git-workflow-planning:checkpoint 6 sticky font and size defaults`

---

## Phase 7 — Server-side font embedding

**Goal:** Exported / printed / emailed PDFs render annotations in the chosen font and size.

**Tasks:**
- `npm install @pdf-lib/fontkit`.
- `pdf-merger.ts`:
  - Import fontkit; register on the loaded `PDFDocument`.
  - Resolve fonts lazily: built ins via `embedStandardFont(StandardFonts.Helvetica | TimesRoman)`, embedded via `embedFont(fs.readFileSync(path), { subset: true })`.
  - Cache in a `Map<AnnotationFontFamily, PDFFont>` per call.
  - Pass `font` to each `page.drawText({ ..., font })`.
  - Annotations without `fontFamily` continue to render in Helvetica.
- `src/lib/documents/font-paths.ts` (new) — single source of truth for the on-disk paths.

**Verification:**
- Place one annotation in each of the five fonts at varying sizes.
- Hit Download → open the PDF → confirm each annotation matches the on-screen preview.
- Hit Print → confirm preview matches.
- Hit Email → send to a test address → confirm attached PDF matches.

**Checkpoint:** `/git-workflow-planning:checkpoint 7 embed selected fonts in pdf export`

---

## Phase 8 — Cleanup, regression check, finish

**Tasks:**
- Re-run lint, type-check, full test suite.
- Re-test the existing flows the user previously validated:
  - Place signature
  - Place agent / contact field
  - Drag, resize, delete an annotation
  - Save draft / reload draft
- Update `docs/Development_Roadmap.md` (or whatever roadmap file exists) with this feature checked off, per Rule 7.
- Run `/git-workflow-planning:finish` → opens PR to develop, asks before merge.

---

## Out of Scope (deferred)

- Color picker
- Bold / italic toggles
- Multi-line text annotations
- Per-document font defaults (defaults are global)
- Migration of saved drafts to populate `fontFamily` — drafts without it render in Helvetica naturally

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Verdana / Georgia licensing blocks shipping the .ttf | License check is first task of Phase 3; swap to DejaVu Sans before adding files |
| `@pdf-lib/fontkit` increases serverless cold start | Embedded fonts loaded only when an annotation references them; subset to ASCII when possible |
| Toolbox positioning races with overlay layout on first render | Use `useLayoutEffect` for measurement; render toolbox on the second paint if first measurement is zero |
| Sticky defaults pollute across users on shared machines | Acceptable — localStorage is per-browser-profile; documented in spec |
