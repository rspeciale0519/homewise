"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { pdfToScreen, screenToPdf } from "@/lib/documents/coordinates";
import type {
  Annotation,
  AnnotationMode,
  PageDimensions,
} from "@/types/document-viewer";

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: "nwse-resize", n: "ns-resize", ne: "nesw-resize", e: "ew-resize",
  se: "nwse-resize", s: "ns-resize", sw: "nesw-resize", w: "ew-resize",
};

interface AnnotationOverlayProps {
  pageIndex: number;
  dims: PageDimensions;
  annotations: Annotation[];
  activeMode: AnnotationMode;
  onPlaceAnnotation: (pageIndex: number, pdfX: number, pdfY: number) => void;
  onDeleteAnnotation: (id: string) => void;
  onMoveAnnotation: (id: string, pdfX: number, pdfY: number) => void;
  onResizeAnnotation: (id: string, width: number, height: number) => void;
}

export function AnnotationOverlay({
  pageIndex, dims, annotations, activeMode,
  onPlaceAnnotation, onDeleteAnnotation, onMoveAnnotation, onResizeAnnotation,
}: AnnotationOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const dragStartRef = useRef<{
    annId: string; startPdfX: number; startPdfY: number;
    mouseX: number; mouseY: number;
  } | null>(null);

  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeDelta, setResizeDelta] = useState({ dw: 0, dh: 0 });
  const resizeStartRef = useRef<{
    annId: string; startW: number; startH: number;
    mouseX: number; mouseY: number; handle: ResizeHandle;
  } | null>(null);

  const getOverlayRelativePos = useCallback(
    (clientX: number, clientY: number) => {
      const el = overlayRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }, []
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeMode !== "cursor") {
        if (draggingId) return;
        const { x, y } = getOverlayRelativePos(e.clientX, e.clientY);
        const { pdfX, pdfY } = screenToPdf(x, y, dims);
        onPlaceAnnotation(pageIndex, pdfX, pdfY);
      } else {
        setSelectedId(null);
      }
    },
    [activeMode, dims, pageIndex, onPlaceAnnotation, draggingId, getOverlayRelativePos]
  );

  const handleAnnotationMouseDown = useCallback(
    (annId: string, ann: Annotation, e: React.MouseEvent) => {
      if (activeMode !== "cursor") return;
      e.stopPropagation();
      e.preventDefault();
      setSelectedId(annId);
      setDraggingId(annId);
      setDragOffset({ dx: 0, dy: 0 });
      dragStartRef.current = {
        annId, startPdfX: ann.pdfX, startPdfY: ann.pdfY,
        mouseX: e.clientX, mouseY: e.clientY,
      };

      const onMove = (me: MouseEvent) => {
        const start = dragStartRef.current;
        if (!start) return;
        setDragOffset({ dx: me.clientX - start.mouseX, dy: me.clientY - start.mouseY });
      };
      const onUp = (me: MouseEvent) => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        const start = dragStartRef.current;
        if (!start) return;
        const dx = me.clientX - start.mouseX;
        const dy = me.clientY - start.mouseY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          const sx = dims.pdfWidth / dims.renderWidth;
          const sy = dims.pdfHeight / dims.renderHeight;
          onMoveAnnotation(start.annId, start.startPdfX + dx * sx, start.startPdfY - dy * sy);
        }
        setDraggingId(null);
        setDragOffset({ dx: 0, dy: 0 });
        dragStartRef.current = null;
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [activeMode, dims, onMoveAnnotation]
  );

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
        setResizingId(null);
        setResizeDelta({ dw: 0, dh: 0 });
        resizeStartRef.current = null;
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [dims, onResizeAnnotation]
  );

  const cursorClass = activeMode === "cursor" ? "cursor-default"
    : activeMode === "signature" ? "cursor-crosshair" : "cursor-text";

  return (
    <div ref={overlayRef} className={`absolute inset-0 ${cursorClass}`} onClick={handleClick}>
      {pageAnnotations.map((ann) => {
        const { screenX, screenY } = pdfToScreen(ann.pdfX, ann.pdfY, dims);
        const isDragging = draggingId === ann.id;
        const isResizing = resizingId === ann.id;
        const isSelected = selectedId === ann.id && activeMode === "cursor";
        const transform = isDragging
          ? `translate(${dragOffset.dx}px, ${dragOffset.dy}px)` : undefined;

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
                cursor: activeMode === "cursor" ? (isDragging ? "grabbing" : "grab") : undefined,
                transform,
                zIndex: isDragging || isResizing || isSelected ? 50 : undefined,
                opacity: isDragging ? 0.8 : undefined,
                transition: isDragging || isResizing ? "none" : "transform 0.15s ease",
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

        const fontSize = ann.fontSize * dims.scale;
        return (
          <div
            key={ann.id}
            className="absolute group"
            style={{
              left: screenX, top: screenY - fontSize,
              cursor: activeMode === "cursor" ? (isDragging ? "grabbing" : "grab") : undefined,
              transform,
              zIndex: isDragging ? 50 : undefined,
              opacity: isDragging ? 0.8 : undefined,
              transition: isDragging ? "none" : "transform 0.15s ease",
            }}
            onMouseDown={(e) => handleAnnotationMouseDown(ann.id, ann, e)}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{
              fontSize, color: ann.color, lineHeight: 1,
              whiteSpace: "nowrap", fontFamily: "var(--font-dm-sans), sans-serif",
            }}>
              {ann.value}
            </span>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-crimson-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
            >
              &times;
            </button>
          </div>
        );
      })}
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
  const handleSize = w < 80 || h < 40 ? 6 : 8;
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
        className="absolute inset-0 border-2 border-navy-500 rounded-sm pointer-events-none"
        style={{ margin: -1 }}
      />

      {/* Delete button */}
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onDelete(ann.id); }}
        className="absolute -top-3 -right-3 h-5 w-5 rounded-full bg-crimson-600 text-white flex items-center justify-center text-xs shadow-sm z-10 hover:bg-crimson-700 transition-colors"
      >
        &times;
      </button>

      {/* 8 resize handles */}
      {handles.map(({ handle, style }) => (
        <div
          key={handle}
          onMouseDown={(e) => onResizeStart(ann.id, ann, handle, e)}
          className="absolute bg-white border-2 border-navy-500 rounded-sm z-10"
          style={{
            ...style,
            width: handleSize,
            height: handleSize,
            cursor: HANDLE_CURSORS[handle],
          }}
        />
      ))}
    </>
  );
}
