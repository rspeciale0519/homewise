"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { AnnotationOverlay } from "@/components/documents/annotation-overlay";
import type {
  Annotation,
  AnnotationFontFamily,
  AnnotationMode,
  PageDimensions,
  PdfDocumentHandle,
} from "@/types/document-viewer";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPageRendererProps {
  fileUrl: string;
  scale: number;
  onDocumentLoad: (pdf: PdfDocumentHandle) => void;
  onPageInView: (pageNumber: number) => void;
  annotations: Annotation[];
  activeMode: AnnotationMode;
  pageDims: Map<number, PageDimensions>;
  onPageDims: (pageIndex: number, dims: PageDimensions) => void;
  defaultTextStyle: { fontFamily: AnnotationFontFamily; fontSize: number };
  onPlaceAnnotation: (pageIndex: number, pdfX: number, pdfY: number) => void;
  onCreateTextAnnotation: (
    pageIndex: number,
    pdfX: number,
    pdfY: number,
    value: string,
    style: { fontFamily: AnnotationFontFamily; fontSize: number }
  ) => void;
  onUpdateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onMoveAnnotation: (id: string, pdfX: number, pdfY: number) => void;
  onResizeAnnotation: (id: string, width: number, height: number) => void;
}

export function PdfPageRenderer({
  fileUrl,
  scale,
  onDocumentLoad,
  onPageInView,
  annotations,
  activeMode,
  pageDims,
  onPageDims,
  defaultTextStyle,
  onPlaceAnnotation,
  onCreateTextAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onMoveAnnotation,
  onResizeAnnotation,
}: PdfPageRendererProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const onDocumentLoadSuccess = useCallback(
    (pdf: PdfDocumentHandle) => {
      setNumPages(pdf.numPages);
      onDocumentLoad(pdf);
    },
    [onDocumentLoad]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let topVisiblePage = 0;
        let topVisibleY = Infinity;

        for (const entry of entries) {
          const pageNum = Number(entry.target.getAttribute("data-page"));
          if (entry.isIntersecting) {
            setLoadedPages((prev) => {
              const next = new Set(prev);
              next.add(pageNum);
              return next;
            });
            const rect = entry.boundingClientRect;
            if (entry.intersectionRatio > 0.3 && rect.top < topVisibleY) {
              topVisibleY = rect.top;
              topVisiblePage = pageNum;
            }
          }
        }

        if (topVisiblePage > 0) {
          onPageInView(topVisiblePage);
        }
      },
      {
        root: containerRef.current?.parentElement,
        rootMargin: "200px 0px",
        threshold: [0, 0.3, 0.5],
      }
    );

    const refs = pageRefs.current;
    refs.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [numPages, onPageInView]);

  const setPageRef = useCallback(
    (pageNum: number, el: HTMLDivElement | null) => {
      if (el) {
        pageRefs.current.set(pageNum, el);
      } else {
        pageRefs.current.delete(pageNum);
      }
    },
    []
  );

  const handlePageRender = useCallback(
    (pageNum: number) => {
      const pageIndex = pageNum - 1;
      const el = pageRefs.current.get(pageNum);
      if (!el) return;
      const canvas = el.querySelector("canvas");
      if (!canvas) return;

      const pdfWidth = canvas.width / (scale * window.devicePixelRatio);
      const pdfHeight = canvas.height / (scale * window.devicePixelRatio);
      const renderWidth = canvas.clientWidth;
      const renderHeight = canvas.clientHeight;

      onPageDims(pageIndex, {
        pdfWidth,
        pdfHeight,
        renderWidth,
        renderHeight,
        scale,
      });
    },
    [scale, onPageDims]
  );

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4 py-6">
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={<PageSkeleton />}
        error={<PageError />}
      >
        {numPages !== null &&
          Array.from({ length: numPages }, (_, i) => {
            const pageNum = i + 1;
            const pageIndex = i;
            const isLoaded = loadedPages.has(pageNum);
            const dims = pageDims.get(pageIndex);

            return (
              <div
                key={pageNum}
                ref={(el) => setPageRef(pageNum, el)}
                data-page={pageNum}
                className="mb-4 shadow-card rounded-lg overflow-hidden bg-white relative"
              >
                {isLoaded ? (
                  <>
                    <Page
                      pageNumber={pageNum}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={true}
                      renderForms={true}
                      loading={<PageSkeleton />}
                      onRenderSuccess={() => handlePageRender(pageNum)}
                    />
                    {dims && (
                      <AnnotationOverlay
                        pageIndex={pageIndex}
                        dims={dims}
                        annotations={annotations}
                        activeMode={activeMode}
                        defaultTextStyle={defaultTextStyle}
                        onPlaceAnnotation={onPlaceAnnotation}
                        onCreateTextAnnotation={onCreateTextAnnotation}
                        onUpdateAnnotation={onUpdateAnnotation}
                        onDeleteAnnotation={onDeleteAnnotation}
                        onMoveAnnotation={onMoveAnnotation}
                        onResizeAnnotation={onResizeAnnotation}
                      />
                    )}
                  </>
                ) : (
                  <PageSkeleton />
                )}
              </div>
            );
          })}
      </Document>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="w-[612px] h-[792px] bg-slate-50 animate-pulse flex items-center justify-center">
      <svg
        className="h-8 w-8 text-slate-200"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    </div>
  );
}

function PageError() {
  return (
    <div className="w-[612px] h-[400px] bg-slate-50 flex flex-col items-center justify-center gap-3">
      <svg
        className="h-8 w-8 text-crimson-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      <p className="text-sm text-slate-500">Failed to load document</p>
    </div>
  );
}
