"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { pdfToScreen, screenToPdf } from "@/lib/documents/coordinates";
import {
  DEFAULT_ANNOTATION_FONT_FAMILY,
  DEFAULT_ANNOTATION_FONT_SIZE,
  fontFamilyCss,
} from "@/lib/documents/fonts";
import {
  FLAG_BASE_HEIGHT,
  FLAG_DEFAULT_ROTATION,
  FLAG_DEFAULT_SCALE,
  FLAG_DRAG_THRESHOLD_PX,
  FLAG_ROTATION_SNAP_DEGREES,
  clampFlagScale,
  normalizeFlagRotation,
} from "@/lib/documents/flag-colors";
import { AnnotationToolbox } from "@/components/documents/annotation-toolbox";
import { FlagRenderer, type FlagCorner } from "@/components/documents/flag-renderer";
import { FlagSelectionToolbox } from "@/components/documents/flag-selection-toolbox";
import type {
  Annotation,
  AnnotationFontFamily,
  AnnotationMode,
  FlagColor,
  PageDimensions,
} from "@/types/document-viewer";

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: "nwse-resize", n: "ns-resize", ne: "nesw-resize", e: "ew-resize",
  se: "nwse-resize", s: "ns-resize", sw: "nesw-resize", w: "ew-resize",
};

interface Draft {
  mode: "create" | "edit";
  annId?: string;
  pdfX: number;
  pdfY: number;
  value: string;
  fontFamily: AnnotationFontFamily;
  fontSize: number;
}

interface AnnotationOverlayProps {
  pageIndex: number;
  dims: PageDimensions;
  annotations: Annotation[];
  activeMode: AnnotationMode;
  defaultTextStyle: { fontFamily: AnnotationFontFamily; fontSize: number };
  onPlaceAnnotation: (pageIndex: number, pdfX: number, pdfY: number) => void;
  onCreateTextAnnotation: (
    pageIndex: number,
    pdfX: number,
    pdfY: number,
    value: string,
    style: { fontFamily: AnnotationFontFamily; fontSize: number }
  ) => void;
  onCreateFlagAnnotation: (
    pageIndex: number,
    pdfX: number,
    pdfY: number
  ) => void;
  onUpdateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onMoveAnnotation: (id: string, pdfX: number, pdfY: number) => void;
  onResizeAnnotation: (id: string, width: number, height: number) => void;
}

function estimateTextWidth(value: string, fontSize: number) {
  return Math.max(120, value.length * fontSize * 0.55);
}

export function AnnotationOverlay({
  pageIndex, dims, annotations, activeMode, defaultTextStyle,
  onPlaceAnnotation, onCreateTextAnnotation, onCreateFlagAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation, onMoveAnnotation, onResizeAnnotation,
}: AnnotationOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartRef = useRef<{
    annId: string; startPdfX: number; startPdfY: number;
    mouseX: number; mouseY: number;
  } | null>(null);
  const dragElRef = useRef<HTMLElement | null>(null);

  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeDelta, setResizeDelta] = useState({ dw: 0, dh: 0 });
  const resizeStartRef = useRef<{
    annId: string; startW: number; startH: number;
    mouseX: number; mouseY: number; handle: ResizeHandle;
  } | null>(null);

  // Live drag preview offset for flag annotations (in PDF coordinates)
  const [flagDragPreview, setFlagDragPreview] = useState<{
    id: string; pdfX: number; pdfY: number;
  } | null>(null);

  // Live preview for flag resize / rotate
  const [flagTransformPreview, setFlagTransformPreview] = useState<{
    id: string; scale?: number; rotation?: number;
  } | null>(null);

  // Prevent stray click events from deselecting after drag/resize
  const justInteractedRef = useRef(false);

  const getOverlayRelativePos = useCallback(
    (clientX: number, clientY: number) => {
      const el = overlayRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }, []
  );

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (justInteractedRef.current) {
      justInteractedRef.current = false;
      return;
    }
    if (activeMode === "cursor") {
      setSelectedId(null);
      return;
    }
    if (draggingId) return;
    const { x, y } = getOverlayRelativePos(e.clientX, e.clientY);
    const { pdfX, pdfY } = screenToPdf(x, y, dims);
    if (activeMode === "text") {
      setDraft({
        mode: "create",
        pdfX, pdfY,
        value: "",
        fontFamily: defaultTextStyle.fontFamily,
        fontSize: defaultTextStyle.fontSize,
      });
    } else if (activeMode === "flag") {
      // Empty-space click in flag mode: deselect any selected flag, then
      // place a new one. Clicks on a flag itself stop propagation before
      // reaching here (see FlagRenderer onClick / onPointerDown handlers).
      setSelectedId(null);
      onCreateFlagAnnotation(pageIndex, pdfX, pdfY);
    } else {
      onPlaceAnnotation(pageIndex, pdfX, pdfY);
    }
  };

  const commitDraft = () => {
    if (!draft) return;
    const trimmed = draft.value.trim();
    if (draft.mode === "edit" && draft.annId) {
      if (trimmed) {
        onUpdateAnnotation(draft.annId, {
          value: trimmed,
          fontFamily: draft.fontFamily,
          fontSize: draft.fontSize,
        });
      } else {
        onDeleteAnnotation(draft.annId);
      }
    } else if (trimmed) {
      onCreateTextAnnotation(pageIndex, draft.pdfX, draft.pdfY, trimmed, {
        fontFamily: draft.fontFamily,
        fontSize: draft.fontSize,
      });
    }
    setDraft(null);
  };

  const cancelDraft = () => setDraft(null);

  const beginEdit = (ann: Annotation) => {
    setDraft({
      mode: "edit",
      annId: ann.id,
      pdfX: ann.pdfX,
      pdfY: ann.pdfY,
      value: ann.value,
      fontFamily: ann.fontFamily ?? DEFAULT_ANNOTATION_FONT_FAMILY,
      fontSize: ann.fontSize,
    });
    setSelectedId(null);
  };

  const handleAnnotationMouseDown = (annId: string, ann: Annotation, e: React.MouseEvent) => {
    if (activeMode !== "cursor") return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(annId);
    setDraggingId(annId);

    const el = (e.currentTarget as HTMLElement);
    dragElRef.current = el;
    el.style.transition = "none";
    el.style.opacity = "0.8";
    el.style.zIndex = "50";
    el.style.cursor = "grabbing";

    dragStartRef.current = {
      annId, startPdfX: ann.pdfX, startPdfY: ann.pdfY,
      mouseX: e.clientX, mouseY: e.clientY,
    };

    const onMove = (me: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start || !dragElRef.current) return;
      const dx = me.clientX - start.mouseX;
      const dy = me.clientY - start.mouseY;
      dragElRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const onUp = (me: MouseEvent) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const start = dragStartRef.current;
      if (dragElRef.current) {
        dragElRef.current.style.transform = "";
        dragElRef.current.style.transition = "";
        dragElRef.current.style.opacity = "";
        dragElRef.current.style.zIndex = "";
        dragElRef.current.style.cursor = "";
      }
      dragElRef.current = null;
      if (!start) return;
      const dx = me.clientX - start.mouseX;
      const dy = me.clientY - start.mouseY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        const sx = dims.pdfWidth / dims.renderWidth;
        const sy = dims.pdfHeight / dims.renderHeight;
        onMoveAnnotation(start.annId, start.startPdfX + dx * sx, start.startPdfY - dy * sy);
        justInteractedRef.current = true;
      }
      setDraggingId(null);
      dragStartRef.current = null;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleResizeMouseDown = useCallback(
    (annId: string, ann: Annotation, handle: ResizeHandle, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setResizingId(annId);
      setResizeDelta({ dw: 0, dh: 0 });
      resizeStartRef.current = {
        annId, startW: ann.width ?? 150, startH: ann.height ?? 60,
        mouseX: e.clientX, mouseY: e.clientY, handle,
      };

      const onMove = (me: MouseEvent) => {
        const s = resizeStartRef.current;
        if (!s) return;
        const dx = me.clientX - s.mouseX;
        const dy = me.clientY - s.mouseY;
        const sc = dims.scale;
        let dw = 0, dh = 0;
        const aspect = s.startW / s.startH;

        if (s.handle === "e") { dw = dx / sc; }
        else if (s.handle === "w") { dw = -dx / sc; }
        else if (s.handle === "s") { dh = dy / sc; }
        else if (s.handle === "n") { dh = -dy / sc; }
        else if (s.handle === "se") { dw = dx / sc; dh = dw / aspect; }
        else if (s.handle === "nw") { dw = -dx / sc; dh = dw / aspect; }
        else if (s.handle === "ne") { dw = dx / sc; dh = dw / aspect; }
        else if (s.handle === "sw") { dw = -dx / sc; dh = dw / aspect; }

        if (s.startW + dw < 30) dw = 30 - s.startW;
        if (s.startH + dh < 15) dh = 15 - s.startH;
        setResizeDelta({ dw, dh });
      };

      const onUp = (me: MouseEvent) => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        const s = resizeStartRef.current;
        if (!s) return;

        // Recompute delta from mouse position (avoid stale closure on state)
        const dx = me.clientX - s.mouseX;
        const dy = me.clientY - s.mouseY;
        const sc = dims.scale;
        let dw = 0, dh = 0;
        const aspect = s.startW / s.startH;

        if (s.handle === "e") { dw = dx / sc; }
        else if (s.handle === "w") { dw = -dx / sc; }
        else if (s.handle === "s") { dh = dy / sc; }
        else if (s.handle === "n") { dh = -dy / sc; }
        else if (s.handle === "se") { dw = dx / sc; dh = dw / aspect; }
        else if (s.handle === "nw") { dw = -dx / sc; dh = dw / aspect; }
        else if (s.handle === "ne") { dw = dx / sc; dh = dw / aspect; }
        else if (s.handle === "sw") { dw = -dx / sc; dh = dw / aspect; }

        if (s.startW + dw < 30) dw = 30 - s.startW;
        if (s.startH + dh < 15) dh = 15 - s.startH;

        const finalW = Math.max(30, Math.round(s.startW + dw));
        const finalH = Math.max(15, Math.round(s.startH + dh));
        if (finalW !== s.startW || finalH !== s.startH) {
          onResizeAnnotation(s.annId, finalW, finalH);
        }
        justInteractedRef.current = true;
        setResizingId(null);
        setResizeDelta({ dw: 0, dh: 0 });
        resizeStartRef.current = null;
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [dims, onResizeAnnotation]
  );

  const selectedFlag =
    selectedId && (activeMode === "cursor" || activeMode === "flag")
      ? pageAnnotations.find((a) => a.id === selectedId && a.type === "flag")
      : undefined;

  useEffect(() => {
    if (!selectedFlag) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onDeleteAnnotation(selectedFlag.id);
        setSelectedId(null);
        return;
      }
      const arrow =
        e.key === "ArrowLeft" ? { dx: -1, dy: 0 } :
        e.key === "ArrowRight" ? { dx: 1, dy: 0 } :
        e.key === "ArrowUp" ? { dx: 0, dy: 1 } :
        e.key === "ArrowDown" ? { dx: 0, dy: -1 } : null;
      if (arrow) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        onMoveAnnotation(
          selectedFlag.id,
          selectedFlag.pdfX + arrow.dx * step,
          selectedFlag.pdfY + arrow.dy * step
        );
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedFlag, onDeleteAnnotation, onMoveAnnotation]);

  const tipViewportCoords = (ann: Annotation) => {
    const tip = pdfToScreen(ann.pdfX, ann.pdfY, dims);
    const rect = overlayRef.current?.getBoundingClientRect();
    return {
      x: tip.screenX + (rect?.left ?? 0),
      y: tip.screenY + (rect?.top ?? 0),
    };
  };

  const handleFlagResizePointerDown = (
    ann: Annotation,
    _corner: FlagCorner,
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    const tip = tipViewportCoords(ann);
    const startDist = Math.hypot(e.clientX - tip.x, e.clientY - tip.y);
    const startScale = ann.scale ?? FLAG_DEFAULT_SCALE;
    if (startDist < 1) return;

    const onMove = (me: PointerEvent) => {
      const dist = Math.hypot(me.clientX - tip.x, me.clientY - tip.y);
      const ratio = dist / startDist;
      const next = clampFlagScale(startScale * ratio);
      setFlagTransformPreview({ id: ann.id, scale: next });
    };

    const onUp = (me: PointerEvent) => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      const dist = Math.hypot(me.clientX - tip.x, me.clientY - tip.y);
      const ratio = dist / startDist;
      const finalScale = clampFlagScale(startScale * ratio);
      if (Math.abs(finalScale - startScale) > 0.001) {
        onUpdateAnnotation(ann.id, { scale: finalScale });
        justInteractedRef.current = true;
      }
      setFlagTransformPreview(null);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const handleFlagRotatePointerDown = (ann: Annotation, e: React.PointerEvent) => {
    e.preventDefault();
    const tip = tipViewportCoords(ann);
    const startRotation = ann.rotation ?? FLAG_DEFAULT_ROTATION;
    const startAngleDeg =
      (Math.atan2(e.clientY - tip.y, e.clientX - tip.x) * 180) / Math.PI;

    const computeRotation = (clientX: number, clientY: number) => {
      const angleDeg =
        (Math.atan2(clientY - tip.y, clientX - tip.x) * 180) / Math.PI;
      const delta = angleDeg - startAngleDeg;
      let next = normalizeFlagRotation(startRotation + delta);
      // Snap to nearest cardinal within ±FLAG_ROTATION_SNAP_DEGREES
      for (const cardinal of [0, 90, 180, 270]) {
        const diff = Math.abs(next - cardinal);
        const wrap = Math.min(diff, 360 - diff);
        if (wrap <= FLAG_ROTATION_SNAP_DEGREES) {
          next = cardinal;
          break;
        }
      }
      return next;
    };

    const onMove = (me: PointerEvent) => {
      const next = computeRotation(me.clientX, me.clientY);
      setFlagTransformPreview({ id: ann.id, rotation: next });
    };

    const onUp = (me: PointerEvent) => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      const finalRotation = computeRotation(me.clientX, me.clientY);
      if (Math.abs(finalRotation - startRotation) > 0.001) {
        onUpdateAnnotation(ann.id, { rotation: finalRotation });
        justInteractedRef.current = true;
      }
      setFlagTransformPreview(null);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const handleFlagPointerDown = (ann: Annotation, e: React.PointerEvent) => {
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startPdfX = ann.pdfX;
    const startPdfY = ann.pdfY;
    const sx = dims.pdfWidth / dims.renderWidth;
    const sy = dims.pdfHeight / dims.renderHeight;
    let dragStarted = false;

    const onMove = (me: PointerEvent) => {
      const dx = me.clientX - startMouseX;
      const dy = me.clientY - startMouseY;
      if (!dragStarted) {
        if (Math.abs(dx) < FLAG_DRAG_THRESHOLD_PX && Math.abs(dy) < FLAG_DRAG_THRESHOLD_PX) return;
        dragStarted = true;
      }
      setFlagDragPreview({
        id: ann.id,
        pdfX: startPdfX + dx * sx,
        pdfY: startPdfY - dy * sy,
      });
    };

    const onUp = (me: PointerEvent) => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      const dx = me.clientX - startMouseX;
      const dy = me.clientY - startMouseY;
      const moved =
        Math.abs(dx) >= FLAG_DRAG_THRESHOLD_PX || Math.abs(dy) >= FLAG_DRAG_THRESHOLD_PX;
      if (moved) {
        const finalPdfX = startPdfX + dx * sx;
        const finalPdfY = startPdfY - dy * sy;
        onMoveAnnotation(ann.id, finalPdfX, finalPdfY);
        justInteractedRef.current = true;
        setSelectedId(ann.id);
      } else {
        // Below threshold = treat as a click (select if not already selected).
        setSelectedId(ann.id);
      }
      setFlagDragPreview(null);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const cursorClass = activeMode === "cursor" ? "cursor-default"
    : activeMode === "signature" ? "cursor-crosshair"
    : activeMode === "flag" ? "cursor-crosshair"
    : "cursor-text";

  const draftScreen = draft ? pdfToScreen(draft.pdfX, draft.pdfY, dims) : null;
  const draftScaledFontSize = draft ? draft.fontSize * dims.scale : 0;

  const selectedTextAnn =
    activeMode === "cursor" && selectedId
      ? pageAnnotations.find((a) => a.id === selectedId && a.type === "text")
      : undefined;

  let toolboxAnchor: { left: number; top: number } | null = null;
  let toolboxWidth = 0;
  let toolboxFontFamily: AnnotationFontFamily = DEFAULT_ANNOTATION_FONT_FAMILY;
  let toolboxFontSize = DEFAULT_ANNOTATION_FONT_SIZE;
  let toolboxHandler: ((next: { fontFamily?: AnnotationFontFamily; fontSize?: number }) => void) | null = null;
  let toolboxClose: (() => void) | null = null;

  if (draft && draftScreen) {
    toolboxAnchor = {
      left: draftScreen.screenX,
      top: draftScreen.screenY - draftScaledFontSize - 2,
    };
    toolboxWidth = estimateTextWidth(draft.value, draftScaledFontSize);
    toolboxFontFamily = draft.fontFamily;
    toolboxFontSize = draft.fontSize;
    toolboxHandler = (next) => setDraft((d) => (d ? { ...d, ...next } : d));
    toolboxClose = cancelDraft;
  } else if (selectedTextAnn) {
    const { screenX, screenY } = pdfToScreen(selectedTextAnn.pdfX, selectedTextAnn.pdfY, dims);
    const scaledFs = selectedTextAnn.fontSize * dims.scale;
    toolboxAnchor = { left: screenX, top: screenY - scaledFs };
    toolboxWidth = estimateTextWidth(selectedTextAnn.value, scaledFs);
    toolboxFontFamily = selectedTextAnn.fontFamily ?? DEFAULT_ANNOTATION_FONT_FAMILY;
    toolboxFontSize = selectedTextAnn.fontSize;
    toolboxHandler = (next) => onUpdateAnnotation(selectedTextAnn.id, next);
    toolboxClose = () => setSelectedId(null);
  }

  return (
    <div ref={overlayRef} className={`absolute inset-0 ${cursorClass}`} onClick={handleClick}>
      {pageAnnotations.map((ann) => {
        const { screenX, screenY } = pdfToScreen(ann.pdfX, ann.pdfY, dims);
        const isDragging = draggingId === ann.id;
        const isResizing = resizingId === ann.id;
        const flagInteractive =
          ann.type === "flag" && (activeMode === "cursor" || activeMode === "flag");
        const isSelected =
          selectedId === ann.id && (activeMode === "cursor" || flagInteractive);
        const isEditing = draft?.mode === "edit" && draft.annId === ann.id;

        if (ann.type === "flag") {
          let previewFlag: Annotation = ann;
          if (flagDragPreview && flagDragPreview.id === ann.id) {
            previewFlag = { ...previewFlag, pdfX: flagDragPreview.pdfX, pdfY: flagDragPreview.pdfY };
          }
          if (flagTransformPreview && flagTransformPreview.id === ann.id) {
            previewFlag = {
              ...previewFlag,
              scale: flagTransformPreview.scale ?? previewFlag.scale,
              rotation: flagTransformPreview.rotation ?? previewFlag.rotation,
            };
          }
          // Flags participate in selection in BOTH cursor mode and flag mode.
          // In flag mode, clicking an existing flag selects/manipulates it
          // instead of placing a new one (the click stops propagation here).
          const interactive =
            activeMode === "cursor" || activeMode === "flag";
          return (
            <FlagRenderer
              key={ann.id}
              flag={previewFlag}
              dims={dims}
              selected={isSelected}
              onPointerDown={(e) => {
                if (!interactive) return;
                if (e.button !== 0) return;
                e.stopPropagation();
                e.preventDefault();
                handleFlagPointerDown(ann, e);
              }}
              onClick={(e) => {
                if (!interactive) return;
                e.stopPropagation();
              }}
              onResizeHandlePointerDown={(corner, ev) =>
                handleFlagResizePointerDown(ann, corner, ev)
              }
              onRotateHandlePointerDown={(ev) =>
                handleFlagRotatePointerDown(ann, ev)
              }
            />
          );
        }

        if (ann.type === "signature" && ann.width && ann.height) {
          const baseW = ann.width;
          const baseH = ann.height;
          const w = (baseW + (isResizing ? resizeDelta.dw : 0)) * dims.scale;
          const h = (baseH + (isResizing ? resizeDelta.dh : 0)) * dims.scale;

          return (
            <div
              key={ann.id}
              className="absolute"
              style={{
                left: screenX, top: screenY - h, width: w, height: h,
                cursor: activeMode === "cursor" ? "grab" : undefined,
                zIndex: isResizing || isSelected ? 50 : undefined,
                transition: isResizing ? "none" : undefined,
              }}
              onMouseDown={(e) => handleAnnotationMouseDown(ann.id, ann, e)}
              onClick={(e) => { e.stopPropagation(); setSelectedId(ann.id); }}
            >
              <Image
                src={ann.value} alt="Signature"
                width={Math.round(w)} height={Math.round(h)}
                className="w-full h-full object-contain pointer-events-none" unoptimized
              />

              {isSelected && !isDragging && (
                <SelectionFrame
                  ann={ann} w={w} h={h}
                  onDelete={onDeleteAnnotation}
                  onResizeStart={handleResizeMouseDown}
                />
              )}
            </div>
          );
        }

        if (isEditing) {
          // Hidden while the inline editor is active
          return null;
        }

        const fontSize = ann.fontSize * dims.scale;
        return (
          <div
            key={ann.id}
            className="absolute group"
            style={{
              left: screenX, top: screenY - fontSize,
              cursor: activeMode === "cursor" ? "grab" : undefined,
              outline: isSelected ? "2px solid #3b82f6" : undefined,
              outlineOffset: isSelected ? 2 : undefined,
              borderRadius: isSelected ? 2 : undefined,
              zIndex: isSelected ? 50 : undefined,
            }}
            onMouseDown={(e) => handleAnnotationMouseDown(ann.id, ann, e)}
            onClick={(e) => { e.stopPropagation(); setSelectedId(ann.id); }}
            onDoubleClick={(e) => { e.stopPropagation(); beginEdit(ann); }}
          >
            <span style={{
              fontSize, color: ann.color, lineHeight: 1,
              whiteSpace: "nowrap", fontFamily: fontFamilyCss(ann.fontFamily),
            }}>
              {ann.value}
            </span>
            {isSelected && (
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}
                className="absolute h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold z-20 hover:bg-red-600 transition-colors"
                style={{ top: -10, right: -10, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
              >
                &times;
              </button>
            )}
            {!isSelected && (
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-crimson-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              >
                &times;
              </button>
            )}
          </div>
        );
      })}

      {draft && draftScreen && (
        <input
          type="text"
          autoFocus
          value={draft.value}
          onChange={(e) => setDraft({ ...draft, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelDraft();
            }
          }}
          onBlur={commitDraft}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute bg-white/95 outline-none border border-blue-400 rounded-sm px-1 shadow-sm"
          style={{
            left: draftScreen.screenX,
            top: draftScreen.screenY - draftScaledFontSize - 2,
            minWidth: 120,
            fontSize: draftScaledFontSize,
            color: "#000000",
            lineHeight: 1.2,
            fontFamily: fontFamilyCss(draft.fontFamily),
            zIndex: 60,
          }}
          placeholder="Type text..."
        />
      )}

      {toolboxAnchor && toolboxHandler && (
        <AnnotationToolbox
          fontFamily={toolboxFontFamily}
          fontSize={toolboxFontSize}
          anchor={toolboxAnchor}
          targetWidth={toolboxWidth}
          onChange={toolboxHandler}
          onClose={toolboxClose ?? undefined}
        />
      )}

      {selectedFlag && (() => {
        const usePreview =
          flagDragPreview && flagDragPreview.id === selectedFlag.id;
        const liveX = usePreview ? flagDragPreview.pdfX : selectedFlag.pdfX;
        const liveY = usePreview ? flagDragPreview.pdfY : selectedFlag.pdfY;
        const { screenX, screenY } = pdfToScreen(liveX, liveY, dims);
        const flagH = FLAG_BASE_HEIGHT * (selectedFlag.scale ?? FLAG_DEFAULT_SCALE) * dims.scale;
        // Stack vertically above the rotate handle:
        //   flag top → 24px connector → 14px rotate handle → 10px gap → toolbox bottom
        // Toolbox is ~44px tall; account for that with a top offset of 92.
        return (
          <FlagSelectionToolbox
            key={selectedFlag.id}
            flag={selectedFlag}
            anchor={{
              left: screenX - 60,
              top: screenY - flagH / 2 - 92,
            }}
            onChangeColor={(c: FlagColor) => onUpdateAnnotation(selectedFlag.id, { color: c })}
            onChangeLabel={(label) => onUpdateAnnotation(selectedFlag.id, { value: label })}
            onDelete={() => {
              onDeleteAnnotation(selectedFlag.id);
              setSelectedId(null);
            }}
            onClose={() => setSelectedId(null)}
          />
        );
      })()}
    </div>
  );
}

function SelectionFrame({
  ann, w, h, onDelete, onResizeStart,
}: {
  ann: Annotation;
  w: number;
  h: number;
  onDelete: (id: string) => void;
  onResizeStart: (id: string, ann: Annotation, handle: ResizeHandle, e: React.MouseEvent) => void;
}) {
  const handleSize = w < 80 || h < 40 ? 7 : 9;
  const half = handleSize / 2;

  const handles: { handle: ResizeHandle; style: React.CSSProperties }[] = [
    { handle: "nw", style: { top: -half, left: -half } },
    { handle: "n", style: { top: -half, left: w / 2 - half } },
    { handle: "ne", style: { top: -half, right: -half } },
    { handle: "e", style: { top: h / 2 - half, right: -half } },
    { handle: "se", style: { bottom: -half, right: -half } },
    { handle: "s", style: { bottom: -half, left: w / 2 - half } },
    { handle: "sw", style: { bottom: -half, left: -half } },
    { handle: "w", style: { top: h / 2 - half, left: -half } },
  ];

  return (
    <>
      {/* Selection border */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: -2,
          border: '2px solid #3b82f6',
          borderRadius: 2,
          boxShadow: '0 0 0 1px rgba(59,130,246,0.2)',
        }}
      />

      {/* Delete button */}
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onDelete(ann.id); }}
        className="absolute h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold z-20 hover:bg-red-600 transition-colors"
        style={{ top: -10, right: -10, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
      >
        &times;
      </button>

      {/* 8 resize handles */}
      {handles.map(({ handle: h, style: s }) => (
        <div
          key={h}
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onResizeStart(ann.id, ann, h, e); }}
          className="absolute z-10"
          style={{
            ...s,
            width: handleSize,
            height: handleSize,
            cursor: HANDLE_CURSORS[h],
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            border: '1.5px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      ))}
    </>
  );
}
