"use client";

import { useCallback } from "react";
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
  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeMode === "cursor") return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const { pdfX, pdfY } = screenToPdf(clickX, clickY, dims);
      onPlaceAnnotation(pageIndex, pdfX, pdfY);
    },
    [activeMode, dims, pageIndex, onPlaceAnnotation]
  );

  const handleDragEnd = useCallback(
    (annotationId: string, e: React.DragEvent<HTMLDivElement>) => {
      const overlay = e.currentTarget.parentElement;
      if (!overlay) return;
      const rect = overlay.getBoundingClientRect();
      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;
      const { pdfX, pdfY } = screenToPdf(dropX, dropY, dims);
      onMoveAnnotation(annotationId, pdfX, pdfY);
    },
    [dims, onMoveAnnotation]
  );

  const cursorClass =
    activeMode === "cursor"
      ? "cursor-default"
      : activeMode === "signature"
        ? "cursor-crosshair"
        : "cursor-text";

  return (
    <div
      className={`absolute inset-0 ${cursorClass}`}
      style={{ width: dims.renderWidth, height: dims.renderHeight }}
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
              draggable
              onDragEnd={(e) => handleDragEnd(ann.id, e)}
              className="absolute group"
              style={{
                left: screenX,
                top: screenY - h,
                width: w,
                height: h,
              }}
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
            draggable
            onDragEnd={(e) => handleDragEnd(ann.id, e)}
            className="absolute group"
            style={{
              left: screenX,
              top: screenY - fontSize,
            }}
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
