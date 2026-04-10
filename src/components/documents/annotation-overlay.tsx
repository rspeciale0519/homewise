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
}

export function AnnotationOverlay({
  pageIndex,
  dims,
  annotations,
  activeMode,
  onPlaceAnnotation,
  onDeleteAnnotation,
  onMoveAnnotation,
}: AnnotationOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex);

  // Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartRef = useRef<{ annId: string; startPdfX: number; startPdfY: number; mouseX: number; mouseY: number } | null>(null);

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

  // Mouse-based drag handlers (replaces unreliable HTML drag API)
  const handleAnnotationMouseDown = useCallback(
    (annId: string, ann: Annotation, e: React.MouseEvent) => {
      if (activeMode !== "cursor") return;
      e.stopPropagation();
      e.preventDefault();
      setDraggingId(annId);
      dragStartRef.current = {
        annId,
        startPdfX: ann.pdfX,
        startPdfY: ann.pdfY,
        mouseX: e.clientX,
        mouseY: e.clientY,
      };

      const handleMouseMove = (_me: MouseEvent) => {
        // Visual feedback could be added here
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
          const newPdfY = start.startPdfY - dy * scaleY; // Y is flipped in PDF coords
          onMoveAnnotation(start.annId, newPdfX, newPdfY);
        }

        setDraggingId(null);
        dragStartRef.current = null;
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [activeMode, dims, onMoveAnnotation]
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

        if (ann.type === "signature" && ann.width && ann.height) {
          const w = ann.width * dims.scale;
          const h = ann.height * dims.scale;
          return (
            <div
              key={ann.id}
              className="absolute group"
              style={{
                left: screenX,
                top: screenY - h,
                width: w,
                height: h,
                cursor: activeMode === "cursor" ? "grab" : undefined,
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAnnotation(ann.id);
                }}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-crimson-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              >
                &times;
              </button>
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
              cursor: activeMode === "cursor" ? "grab" : undefined,
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteAnnotation(ann.id);
              }}
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
