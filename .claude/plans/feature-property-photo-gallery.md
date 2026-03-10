# Feature: Property Photo Gallery

## Context

The property listing detail page (`/properties/[id]`) currently has a basic photo gallery — a single main image with a horizontal thumbnail strip and a simple lightbox. Users need a polished, professional photo viewing experience to properly evaluate properties. This redesign replaces the existing gallery with a Zillow/Redfin-style mosaic grid and a premium full-screen lightbox with zoom, swipe gestures, thumbnails, and progress tracking.

## File Structure

```
src/components/properties/
  photo-gallery/
    index.ts              -- barrel export
    types.ts              -- shared interfaces
    mosaic-grid.tsx        -- page-level mosaic grid component
    lightbox.tsx           -- full-screen lightbox viewer
    use-zoom.ts            -- pinch/scroll zoom hook
  photo-gallery.tsx        -- re-export for backward compatibility
```

## Critical Files

- `src/components/properties/photo-gallery.tsx` — existing 169-line component to replace with re-export
- `src/app/(marketing)/properties/[id]/page.tsx` — consuming page (lines 113-132 simplify)
- `tailwind.config.ts` — design tokens (navy, crimson, cream, shadows, fonts)
- `src/lib/utils.ts` — `cn()` utility

## Existing Libraries (no new deps)

- `embla-carousel-react` v8.5.2 — carousel
- `@radix-ui/react-dialog` — lightbox modal
- `framer-motion` — animations, swipe-down-to-close drag
- `next/image` — optimized images

---

## Phase 1: File Structure, Types, and Mosaic Grid

### 1a. Create `photo-gallery/types.ts`
- `PhotoGalleryProps { photos: string[]; address: string; }`
- `LightboxProps { photos, address, open, onOpenChange, startIndex }`

### 1b. Create `photo-gallery/mosaic-grid.tsx`
- **Desktop (md+):** CSS Grid mosaic layout
  - 1 photo: full-width hero (16:9)
  - 2 photos: two equal columns
  - 3 photos: 1 large (60%) + 2 stacked (40%)
  - 4 photos: 1 large (60%) + 3 stacked (40%)
  - 5+ photos: 1 large (60%) + 2x2 grid (40%), last cell has "View all N photos" overlay
- **Mobile (<md):** single hero image + "View all N photos" button
- Each grid cell is a `<button>` with `cursor-zoom-in`, wrapping `<Image>`
- Click opens lightbox at that photo's index
- `rounded-2xl overflow-hidden` on container, `gap-0.5` between cells

### 1c. Create `photo-gallery/index.ts` barrel export
### 1d. Replace top-level `photo-gallery.tsx` with re-export

---

## Phase 2: Lightbox Core

### 2a. Create `photo-gallery/lightbox.tsx`
- **Radix Dialog** (controlled via `open`/`onOpenChange`)
- **Main carousel:** Embla with `loop: true`
- **Top bar:** close button + photo counter ("3 / 24") with `aria-live="polite"`
- **Progress bar:** thin animated bar (3px, `bg-white/60`) showing position
- **Keyboard nav:** ArrowLeft/Right (prev/next), Home/End (first/last), Escape (close via Radix)
- **Thumbnail strip:** second Embla instance (`dragFree: true`), synced with main carousel
  - Active thumb: `ring-2 ring-white opacity-100`
  - Inactive: `opacity-50`
  - Click thumb → scroll main carousel
  - Main carousel select → scroll thumb strip to center active

### 2b. Simplify `properties/[id]/page.tsx`
- Remove the single-photo vs multi-photo conditional (lines 113-132)
- Always render `<PhotoGallery>` since mosaic handles all counts

---

## Phase 3: Zoom and Gestures

### 3a. Create `photo-gallery/use-zoom.ts`
- Returns `{ containerRef, style, isZoomed, resetZoom }`
- **Scroll zoom (desktop):** `onWheel` adjusts scale 1x–4x, centered on cursor
- **Pinch zoom (mobile):** pointer events track two-finger distance ratio
- **Pan when zoomed:** pointer move translates image, clamped to bounds
- **Double-tap:** toggle 1x ↔ 2.5x centered on tap position
- Uses `requestAnimationFrame` + CSS transforms (no re-renders during gestures)

### 3b. Integrate zoom into lightbox slides
- Each slide wraps image in zoom container
- When `isZoomed`, disable Embla drag via `watchDrag: false`
- Reset zoom on slide change

### 3c. Add swipe-down-to-close
- Framer Motion `drag="y"` on main image area
- Close threshold: `offset.y > 100` or `velocity.y > 500`
- Overlay opacity fades inversely with drag distance

---

## Phase 4: Polish and Testing

- Verify all photo count scenarios (1, 2, 3, 4, 5+)
- Test mobile gestures (swipe nav, swipe-down close, pinch zoom)
- Verify keyboard navigation and screen reader announcements
- Ensure all files stay under 450 lines
- Run `npm run type-check`, `npm run lint`, `npm run build`
- Visual test in dev-browser at various breakpoints

---

## Verification

1. `npm run type-check` — no TypeScript errors
2. `npm run lint` — no lint violations
3. `npm run build` — successful compilation
4. Dev-browser: navigate to a property with 5+ photos, verify mosaic grid renders correctly
5. Dev-browser: click photo, verify lightbox opens with carousel, thumbnails, counter, progress bar
6. Dev-browser: test keyboard nav (arrows, escape, home/end)
7. Dev-browser: resize to mobile, verify single-hero + button layout, swipe gestures
