"use client";

import { useCallback, useRef, useState } from "react";
import { ViewerToolbar } from "@/components/documents/viewer-toolbar";
import { PdfPageRenderer } from "@/components/documents/pdf-page-renderer";

interface PdfViewerShellProps {
  documentPath: string;
  documentName: string;
  fileUrl: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export function PdfViewerShell({
  documentName,
  fileUrl,
}: PdfViewerShellProps) {
  const [zoom, setZoom] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleZoomFit = useCallback(() => {
    setZoom(1);
  }, []);

  const handleDocumentLoad = useCallback((total: number) => {
    setNumPages(total);
  }, []);

  const handlePageInView = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
  }, []);

  return (
    <div className="flex flex-col min-h-full bg-slate-50">
      <ViewerToolbar
        documentName={documentName}
        currentPage={currentPage}
        numPages={numPages}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomFit={handleZoomFit}
      />

      <div
        ref={scrollContainerRef}
        className="flex-1"
      >
        <PdfPageRenderer
          fileUrl={fileUrl}
          scale={zoom}
          onDocumentLoad={handleDocumentLoad}
          onPageInView={handlePageInView}
        />
      </div>
    </div>
  );
}
