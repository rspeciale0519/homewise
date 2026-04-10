"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { pdfToScreen, screenToPdf } from "@/lib/documents/coordinates";
import type {
  Annotation,
  AnnotationMode,
  PageDimensions,
} from "@/types/document-viewer";

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
  pageIndex,
  dims,
  annotations,
  activeMode,
  onPlaceAnnotation,
  onDeleteAnnotation,
  onMoveAnnotation,
  onResizeAnnotation,
}: AnnotationOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const dragStartRef = useRef<{
    annId: string;
    startPdfX: number;
    startPdfY: number;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const getOverlayRelativePos = useCallback(
    (clientX: number, clientY: number) => {
      const el = overlayRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    []
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeMode === "cursor") return;
      if (draggingId) return;
      const { x, y } = getOverlayRelativePos(e.clientX, e.clientY);
      const { pdfX, pdfY } = screenToPdf(x, y, dims);
      onPlaceAnnotation(pageIndex, pdfX, pdfY);
    },
    [activeMode, dims, pageIndex, onPlaceAnnotation, draggingId, getOverlayRelativePos]
  );

  const handleAnnotationMouseDown = useCallback(
    (annId: string, ann: Annotation, e: React.MouseEvent) => {
      if (activeMode !== "cursor") return;
      e.stopPropagation();
      e.preventDefault();
      setDraggingId(annId);
      setDragOffset({ dx: 0, dy: 0 });
      dragStartRef.current = {
        annId,
        startPdfX: ann.pdfX,
        startPdfY: ann.pdfY,
        mouseX: e.clientX,
        mouseY: e.clientY,
      };

      const handleMouseMove = (me: MouseEvent) => {
        const start = dragStartRef.current;
        if (!start) return;
        setDragOffset({
          dx: me.clientX - start.mouseX,
          dy: me.clientY - start.mouseY,
        });
      };

      const handleMouseUp = (me: MouseEvent) => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        const start = dragStartRef.current;
        if (!start) return;

        const dx = me.clientX - start.mouseX;
        const dy = me.clientY - start.mouseY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          const scaleX = dims.pdfWidth / dims.renderWidth;
          const scaleY = dims.pdfHeight / dims.renderHeight;
          const newPdfX = start.startPdfX + dx * scaleX;
          const newPdfY = start.startPdfY - dy * scaleY;
          onMoveAnnotation(start.annId, newPdfX, newPdfY);
        }

        setDraggingId(null);
        setDragOffset({ dx: 0, dy: 0 });
        dragStartRef.current = null;
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [activeMode, dims, onMoveAnnotation]
  );

  // Resize state
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeScale, setResizeScale] = useState(1);
  const resizeStartRef = useRef<{
    annId: string;
    startWidth: number;
    startHeight: number;
    mouseX: number;
  } | null>(null);

  const handleResizeMouseDown = useCallback(
    (annId: string, ann: Annotation, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setResizingId(annId);
      setResizeScale(1);
      resizeStartRef.current = {
        annId,
        startWidth: ann.width ?? 150,
        startHeight: ann.height ?? 60,
        mouseX: e.clientX,
      };

      const handleMouseMove = (me: MouseEvent) => {
        const start = resizeStartRef.current;
        if (!start) return;
        const dx = me.clientX - start.mouseX;
        const scale = Math.max(0.3, (start.startWidth * dims.scale + dx) / (start.startWidth * dims.scale));
        setResizeScale(scale);
      };

      const handleMouseUp = (me: MouseEvent) => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        const start = resizeStartRef.current;
        if (!start) return;

        const dx = me.clientX - start.mouseX;
        const scale = Math.max(0.3, (start.startWidth * dims.scale + dx) / (start.startWidth * dims.scale));
        const newWidth = Math.round(start.startWidth * scale);
        const newHeight = Math.round(start.startHeight * scale);

        if (Math.abs(scale - 1) > 0.02) {
          onResizeAnnotation(start.annId, newWidth, newHeight);
        }

        setResizingId(null);
        setResizeScale(1);
        resizeStartRef.current = null;
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [dims, onResizeAnnotation]
  );

  const cursorClass =
    activeMode === "cursor"
      ? "cursor-default"
      : activeMode === "signature"
        ? "cursor-crosshair"
        : "cursor-text";

  return (
    <div
      ref={overlayRef}
      className={`absolute inset-0 ${cursorClass}`}
      onClick={handleClick}
    >
      {pageAnnotations.map((ann) => {
        const { screenX, screenY } = pdfToScreen(ann.pdfX, ann.pdfY, dims);
        const isDragging = draggingId === ann.id;
        const transform = isDragging
          ? `translate(${dragOffset.dx}px, ${dragOffset.dy}px)`
          : undefined;

        if (ann.type === "signature" && ann.width && ann.height) {
          const isResizing = resizingId === ann.id;
          const currentScale = isResizing ? resizeScale : 1;
          const w = ann.width * dims.scale * currentScale;
          const h = ann.height * dims.scale * currentScale;
          return (
            <div
              key={ann.id}
              className="absolute group"
              style={{
                left: screenX,
                top: screenY - h,
                width: w,
                height: h,
                cursor: activeMode === "cursor" ? (isDragging ? "grabbing" : "grab") : undefined,
                transform,
                zIndex: isDragging || isResizing ? 50 : undefined,
                opacity: isDragging ? 0.8 : undefined,
                transition: isDragging || isResizing ? "none" : "transform 0.15s ease",
              }}
              onMouseDown={(e) => handleAnnotationMouseDown(ann.id, ann, e)}
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={ann.value}
                alt="Signature"
                width={Math.round(w)}
                height={Math.round(h)}
                className="w-full h-full object-contain pointer-events-none"
                unoptimized
              />
              {!isDragging && activeMode === "cursor" && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAnnotation(ann.id);
                    }}
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-crimson-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  >
                    &times;
                  </button>
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(ann.id, ann, e)}
                    className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-sm bg-navy-600 border-2 border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-nwse-resize"
                  />
                </>
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
              left: screenX,
              top: screenY - fontSize,
              cursor: activeMode === "cursor" ? (isDragging ? "grabbing" : "grab") : undefined,
              transform,
              zIndex: isDragging ? 50 : undefined,
              opacity: isDragging ? 0.8 : undefined,
              transition: isDragging ? "none" : "transform 0.15s ease",
            }}
            onMouseDown={(e) => handleAnnotationMouseDown(ann.id, ann, e)}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              style={{
                fontSize,
                color: ann.color,
                lineHeight: 1,
                whiteSpace: "nowrap",
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            >
              {ann.value}
            </span>
            {!isDragging && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAnnotation(ann.id);
                }}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-crimson-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              >
                &times;
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
