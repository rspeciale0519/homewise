# Custom Text Annotations: Re-edit, Font Picker, Font Size — Design

**Date:** 2026-04-26
**Status:** Approved (pending implementation plan)
**Scope:** Document viewer (`/dashboard/documents/viewer`)

---

## 1. Goal

Extend the existing "Custom Text" inline-edit feature with three additions:

1. **Re-edit:** Double-click a placed text annotation to edit its content inline.
2. **Font picker:** Choose between five fonts that render identically in the browser preview and in the exported/printed/emailed PDF.
3. **Font size picker:** Adjust the size of any text annotation, with both presets and free entry.

Both font and size changes apply to the annotation currently being edited or selected, and the last-used pair becomes the default for subsequent annotations.

## 2. Font List

| # | Name         | Source                         | License |
|---|--------------|--------------------------------|---------|
| 1 | Helvetica    | `pdf-lib` `StandardFonts`      | Built-in to PDF spec |
| 2 | Times        | `pdf-lib` `StandardFonts`      | Built-in to PDF spec |
| 3 | Roboto       | Embedded TTF                   | Apache-2.0 |
| 4 | Source Serif | Embedded TTF                   | SIL OFL 1.1 |
| 5 | Source Sans  | Embedded TTF                   | SIL OFL 1.1 |

Font key set in code: `"Helvetica" | "Times" | "Roboto" | "SourceSerif" | "SourceSans"`. User-facing labels: `"Source Serif"` and `"Source Sans"` (with spaces).

Decision log: Georgia and Verdana were considered but dropped — they are part of Microsoft's Core Fonts for the Web set whose distribution program ended in 2002, leaving redistribution rights ambiguous for a production application. Source Serif (Adobe) and Source Sans (Adobe), both SIL OFL 1.1, provide equivalent serif/sans coverage with unambiguous licensing.

## 3. Data Model

Extend `Annotation` (`src/types/document-viewer.ts`):

```ts
type AnnotationFontFamily =
  | "Helvetica" | "Times" | "Roboto" | "Georgia" | "Verdana";

interface Annotation {
  // ... existing fields
  fontFamily?: AnnotationFontFamily; // omitted = "Helvetica"
  fontSize: number;                  // already exists; default 12
}
```

`fontFamily` is optional in the type so existing drafts and previously-saved annotations continue to deserialize cleanly. Anywhere we read it, we treat `undefined` as `"Helvetica"`.

`exportSchema` and any draft-persistence schema (`src/schemas/document-viewer.schema.ts`) gain a matching `fontFamily` enum.

## 4. Client-Side Rendering

### 4.1 Font assets

- New CSS file `src/styles/annotation-fonts.css` with `@font-face` rules for Roboto, Georgia, Verdana.
- TTF files under `public/fonts/annotations/` (browser fetches them via static URL; server reads the same files from disk for embedding — no duplication).
- Import the CSS once from the root layout.
- Helvetica and Times resolve to system fallback stacks:
  - Helvetica → `Helvetica, Arial, sans-serif`
  - Times → `'Times New Roman', Times, serif`

### 4.2 Font key → CSS family

A small helper `fontFamilyCss(family)` in `src/lib/documents/fonts.ts` maps a font key to a CSS `font-family` string. All client renders go through it. Used by:

- `AnnotationOverlay` — text span and inline editor input.
- `AnnotationToolbox` — preview text in the font dropdown.

## 5. UI: `AnnotationToolbox` (new component)

A floating mini-toolbar that hosts the font and size pickers. Used in two contexts but rendered as the same component.

**Props:**
- `fontFamily: AnnotationFontFamily`
- `fontSize: number`
- `anchor: { left: number; top: number }` — overlay-relative position of the target's top edge.
- `targetWidth: number` — for centering the toolbox above the target.
- `onChange(next: { fontFamily?: AnnotationFontFamily; fontSize?: number }): void`

**Sub-controls:**
1. **Font dropdown** — opens a list of 5 entries; each row labels the font in its own typeface for live preview. Width ~140 px.
2. **Size combobox** — 60 px wide. Hybrid input: typing accepts integers 6–96; an attached chevron opens a preset list `[8, 10, 12, 14, 16, 18, 24, 36]`. Validates on blur (clamps to range; falls back to last valid value if input is empty/invalid).

**Positioning:**
- Default: above the target, centered horizontally.
- If the target's top is within `toolboxHeight + 8` of the page top, flip below the target.
- Horizontally clamp to overlay bounds.

**Lifecycle:**
- Rendered only when there's a draft *or* a selected text annotation in cursor mode.
- Stays visible while the user types (does not steal focus from the editor).
- Closes when selection clears, draft commits/cancels, or activeMode leaves "cursor" or "text".

## 6. Interaction Model

### 6.1 Cursor mode (default)

| Gesture                     | Action |
|-----------------------------|--------|
| Single-click an annotation  | Selects it. Show selection ring + drag/resize handles + `AnnotationToolbox`. |
| Double-click an annotation  | Enters edit mode (see 6.2). |
| Click empty overlay area    | Deselects. Toolbox hides. |
| Toolbox font/size change    | Updates the selected annotation in place via `onUpdateAnnotationStyle(id, patch)`. |

### 6.2 Edit mode (entered via double-click *or* fresh draft from text mode)

- The annotation's `<span>` is replaced by an `<input>` at the same position with the same font and size.
- Drag/resize handles are hidden.
- `AnnotationToolbox` remains visible and operates on the draft state. Live preview: typing or changing font/size updates the input's CSS instantly.
- The underlying annotation is **not mutated** while editing; the live preview comes from the local draft state. Only commit applies changes.
- **Enter** or **blur**: commit. Patch the annotation with `{ value, fontFamily, fontSize }` from the draft. Empty value → delete the annotation.
- **Escape**: discard the draft. The annotation (if re-editing) is unchanged; for a fresh draft, nothing is created.

### 6.3 Re-edit data flow

When the user double-clicks annotation `A`:
1. `AnnotationOverlay` sets `draft = { mode: "edit", annId: A.id, pdfX: A.pdfX, pdfY: A.pdfY, value: A.value, fontFamily: A.fontFamily, fontSize: A.fontSize }`.
2. The annotation's `<span>` for `A.id` is hidden while `draft.annId === A.id` (so the user only sees the input).
3. On commit: `onUpdateAnnotation(A.id, { value, fontFamily, fontSize })`.
4. On cancel: nothing changes; the original annotation stays.

For fresh drafts (text mode click), `draft.mode = "create"` and `draft.annId = null`.

### 6.4 Sticky defaults

- LocalStorage key: `homewise.documentViewer.textDefaults`.
- Schema: `{ fontFamily: AnnotationFontFamily; fontSize: number }` validated with Zod on read.
- Read once on shell mount; held in `defaultsRef` (no re-render needed).
- Written whenever a draft commits with non-default style. Both create and edit flows update defaults.
- New drafts initialize their toolbox state from defaults (or built-in fallback `Helvetica` / `12` if storage is empty/invalid).

## 7. Server-Side Export (`src/lib/documents/pdf-merger.ts`)

- Add `@pdf-lib/fontkit` dependency.
- Register fontkit on the `PDFDocument` once after load.
- Lazily resolve font instances:
  - Built-ins → `pdfDoc.embedStandardFont(StandardFonts.Helvetica | TimesRoman)`.
  - Embedded → read TTF from `public/fonts/annotations/{Roboto,Georgia,Verdana}-Regular.ttf` (resolved via `path.join(process.cwd(), ...)`) and call `pdfDoc.embedFont(bytes, { subset: true })`.
  - Cache embedded fonts per request (a single `Map<AnnotationFontFamily, PDFFont>`).
- `page.drawText(...)` receives the resolved `font` and existing `size: annotation.fontSize`.
- Annotations without `fontFamily` are treated as Helvetica.
- TTF files live under `public/fonts/annotations/` so both the browser (`@font-face` URLs) and the server (`fs.readFile`) consume the same source.

## 8. Validation & Error Handling

| Surface | Failure mode | Behavior |
|---------|--------------|----------|
| `exportSchema` | Unknown `fontFamily` value | Reject with 400; viewer should never produce these. |
| Server export | Missing TTF file on disk | 500 with diagnostic; deploy gate prevents this in practice. |
| Client toolbox | Size input non-numeric or out of 6-96 range | Snap back to last valid value on blur. |
| Client overlay | Annotation has stale `fontFamily` not in current allowlist | Render as Helvetica; do not crash. |
| LocalStorage | Corrupt JSON / unknown values | Ignore; fall back to built-in defaults; overwrite on next commit. |

## 9. Files Touched

**New:**
- `src/components/documents/annotation-toolbox.tsx`
- `src/lib/documents/fonts.ts`
- `src/styles/annotation-fonts.css`
- `public/fonts/annotations/Roboto-Regular.ttf`
- `public/fonts/annotations/Georgia-Regular.ttf` (license check)
- `public/fonts/annotations/Verdana-Regular.ttf` (license check; or DejaVu-Sans-Regular.ttf if Verdana fails check)
- `docs/superpowers/specs/2026-04-26-custom-text-edit-fonts-design.md` (this file)

**Modified:**
- `src/types/document-viewer.ts` — add `AnnotationFontFamily` and `fontFamily` field.
- `src/schemas/document-viewer.schema.ts` — extend annotation schema and `exportSchema`.
- `src/components/documents/annotation-overlay.tsx` — add edit mode, double-click handler, render toolbox, integrate fontFamily.
- `src/components/documents/pdf-page-renderer.tsx` — plumb new callbacks.
- `src/app/dashboard/documents/viewer/pdf-viewer-shell.tsx` — `onUpdateAnnotation`, `onUpdateAnnotationStyle`, sticky-defaults wiring.
- `src/components/documents/viewer-toolbar.tsx` — pass defaults from sticky storage to new drafts (no UI changes).
- `src/lib/documents/pdf-merger.ts` — fontkit, embed fonts, map family → PDFFont.
- `src/app/layout.tsx` — import `annotation-fonts.css`.
- `package.json` — add `@pdf-lib/fontkit`.

## 10. Out of Scope

- Color picker (existing `color` field still defaults to black).
- Bold/italic toggles.
- Multi-line text (the editor remains a single-line input; long text overflows page bounds and the user must reposition).
- Per-document font defaults (sticky defaults are global, not per-document).
- Backwards-compatible migration of saved drafts (drafts without `fontFamily` simply render in Helvetica).

## 11. Acceptance Criteria

- Placing a text annotation in any of the 5 fonts produces a downloaded PDF where the text renders in the chosen font and size.
- Double-clicking an annotation opens an editor pre-populated with its text/font/size; Enter commits, Escape cancels, empty deletes.
- Single-clicking an annotation in cursor mode shows the toolbox; changing font/size updates the rendered span immediately and persists into the next export.
- Reloading the page after picking a non-default style places the next annotation in that style.
- Drafts saved before this change still load and render (without `fontFamily`).
- All existing tests pass; lint and type-check are clean.
