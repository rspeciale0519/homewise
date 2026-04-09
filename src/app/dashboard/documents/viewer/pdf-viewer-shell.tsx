"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ViewerToolbar } from "@/components/documents/viewer-toolbar";
import { PdfPageRenderer } from "@/components/documents/pdf-page-renderer";
import { SignaturePad } from "@/components/documents/signature-pad";
import { EmailDialog } from "@/components/documents/email-dialog";
import { useTrackDocumentView } from "@/hooks/use-track-document-view";
import {
  resolveAgentField,
  resolveContactField,
} from "@/components/documents/annotation-placer";
import type { ContactOption } from "@/components/documents/contact-picker";
import type {
  Annotation,
  AnnotationMode,
  AgentFieldKey,
  AgentInfo,
  ContactFieldKey,
  PageDimensions,
} from "@/types/document-viewer";

interface PdfViewerShellProps {
  documentPath: string;
  documentName: string;
  fileUrl: string;
  agentInfo: AgentInfo;
  savedSignature: string | null;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

let nextId = 0;
function genId() {
  nextId += 1;
  return `ann-${Date.now()}-${nextId}`;
}

export function PdfViewerShell({
  documentPath,
  documentName,
  fileUrl,
  agentInfo,
  savedSignature,
}: PdfViewerShellProps) {
  const [zoom, setZoom] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeMode, setActiveMode] = useState<AnnotationMode>("cursor");
  const [selectedContact, setSelectedContact] = useState<ContactOption | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [pageDims, setPageDims] = useState<Map<number, PageDimensions>>(new Map());

  // Pending placement state
  const [pendingPlacement, setPendingPlacement] = useState<{
    pageIndex: number;
    pdfX: number;
    pdfY: number;
  } | null>(null);
  const [pendingAgentField, setPendingAgentField] = useState<AgentFieldKey | null>(null);
  const [pendingContactField, setPendingContactField] = useState<ContactFieldKey | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Track document view
  useTrackDocumentView(documentPath, documentName);

  // Auto-save draft when annotations change
  useEffect(() => {
    if (!isDirty || annotations.length === 0) return;
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      fetch("/api/documents/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentPath,
          documentName,
          annotations: {
            version: 1,
            documentPath,
            annotations,
            selectedContactId: selectedContact?.id ?? null,
            lastModified: new Date().toISOString(),
          },
        }),
      }).catch(() => {});
      setIsDirty(false);
    }, 30000);
    return () => clearTimeout(autoSaveRef.current);
  }, [isDirty, annotations, documentPath, documentName, selectedContact]);

  // Mark dirty when annotations change
  useEffect(() => {
    if (annotations.length > 0) setIsDirty(true);
  }, [annotations]);

  const handleToggleFavorite = useCallback(async () => {
    const next = !isFavorite;
    setIsFavorite(next);
    if (next) {
      await fetch("/api/documents/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentPath, documentName }),
      }).catch(() => setIsFavorite(false));
    } else {
      await fetch("/api/documents/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentPath }),
      }).catch(() => setIsFavorite(true));
    }
  }, [isFavorite, documentPath, documentName]);

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

  const handlePageDims = useCallback((pageIndex: number, dims: PageDimensions) => {
    setPageDims((prev) => {
      const next = new Map(prev);
      next.set(pageIndex, dims);
      return next;
    });
  }, []);

  const handlePlaceAnnotation = useCallback(
    (pageIndex: number, pdfX: number, pdfY: number) => {
      if (activeMode === "text") {
        setPendingPlacement({ pageIndex, pdfX, pdfY });
      } else if (activeMode === "signature") {
        if (savedSignature) {
          setAnnotations((prev) => [
            ...prev,
            {
              id: genId(),
              pageIndex,
              pdfX,
              pdfY,
              type: "signature",
              value: savedSignature,
              fontSize: 12,
              color: "#000000",
              width: 150,
              height: 60,
            },
          ]);
          setActiveMode("cursor");
        } else {
          setPendingPlacement({ pageIndex, pdfX, pdfY });
          setShowSignaturePad(true);
        }
      } else if (activeMode === "agent-field" && pendingAgentField) {
        const value = resolveAgentField(pendingAgentField, agentInfo);
        if (value) {
          setAnnotations((prev) => [
            ...prev,
            {
              id: genId(),
              pageIndex,
              pdfX,
              pdfY,
              type: "text",
              value,
              fontSize: 12,
              color: "#000000",
            },
          ]);
        }
        setActiveMode("cursor");
        setPendingAgentField(null);
      } else if (activeMode === "contact-field" && pendingContactField && selectedContact) {
        const value = resolveContactField(pendingContactField, selectedContact);
        if (value) {
          setAnnotations((prev) => [
            ...prev,
            {
              id: genId(),
              pageIndex,
              pdfX,
              pdfY,
              type: "text",
              value,
              fontSize: 12,
              color: "#000000",
            },
          ]);
        }
        setActiveMode("cursor");
        setPendingContactField(null);
      }
    },
    [activeMode, savedSignature, agentInfo, selectedContact, pendingAgentField, pendingContactField]
  );

  const handlePlaceText = useCallback(
    (text: string) => {
      if (!pendingPlacement) return;
      setAnnotations((prev) => [
        ...prev,
        {
          id: genId(),
          pageIndex: pendingPlacement.pageIndex,
          pdfX: pendingPlacement.pdfX,
          pdfY: pendingPlacement.pdfY,
          type: "text",
          value: text,
          fontSize: 12,
          color: "#000000",
        },
      ]);
      setPendingPlacement(null);
      setActiveMode("cursor");
    },
    [pendingPlacement]
  );

  const handleSignatureSave = useCallback(
    (dataUrl: string) => {
      if (pendingPlacement) {
        setAnnotations((prev) => [
          ...prev,
          {
            id: genId(),
            pageIndex: pendingPlacement.pageIndex,
            pdfX: pendingPlacement.pdfX,
            pdfY: pendingPlacement.pdfY,
            type: "signature",
            value: dataUrl,
            fontSize: 12,
            color: "#000000",
            width: 150,
            height: 60,
          },
        ]);
        setPendingPlacement(null);
      }
      setShowSignaturePad(false);
      setActiveMode("cursor");
    },
    [pendingPlacement]
  );

  const handleDeleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleMoveAnnotation = useCallback(
    (id: string, pdfX: number, pdfY: number) => {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, pdfX, pdfY } : a))
      );
    },
    []
  );

  const handleSetMode = useCallback((mode: AnnotationMode) => {
    setActiveMode(mode);
    setPendingPlacement(null);
    setPendingAgentField(null);
    setPendingContactField(null);
  }, []);

  const handleSelectAgentField = useCallback((key: AgentFieldKey) => {
    setPendingAgentField(key);
    setActiveMode("agent-field");
  }, []);

  const handleSelectContactField = useCallback((key: ContactFieldKey) => {
    setPendingContactField(key);
    setActiveMode("contact-field");
  }, []);

  const handleDownload = useCallback(async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/documents/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentPath, annotations, action: "download" }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = documentName.replace(/\s+/g, "-") + "-filled.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, [documentPath, documentName, annotations]);

  const handlePrint = useCallback(async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/documents/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentPath, annotations, action: "download" }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => printWindow.print();
      }
    } finally {
      setIsExporting(false);
    }
  }, [documentPath, annotations]);

  const handleEmailSend = useCallback(
    async (to: string, subject: string, message: string) => {
      const res = await fetch("/api/documents/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentPath,
          annotations,
          action: "email",
          emailTo: to,
          emailSubject: subject,
          emailMessage: message,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to send email");
      }
    },
    [documentPath, annotations]
  );

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
        activeMode={activeMode}
        onSetMode={handleSetMode}
        agentInfo={agentInfo}
        selectedContact={selectedContact}
        onSelectContact={setSelectedContact}
        onSelectAgentField={handleSelectAgentField}
        onSelectContactField={handleSelectContactField}
        annotations={annotations}
        pendingPlacement={pendingPlacement}
        onPlaceText={handlePlaceText}
        onCancelPlacement={() => setPendingPlacement(null)}
        onDownload={handleDownload}
        onPrint={handlePrint}
        onEmail={() => setShowEmailDialog(true)}
        isExporting={isExporting}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        onSaveDraft={() => {
          fetch("/api/documents/drafts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentPath,
              documentName,
              annotations: {
                version: 1,
                documentPath,
                annotations,
                selectedContactId: selectedContact?.id ?? null,
                lastModified: new Date().toISOString(),
              },
            }),
          }).catch(() => {});
          setIsDirty(false);
        }}
        isDirty={isDirty}
      />

      <EmailDialog
        open={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        onSend={handleEmailSend}
        documentName={documentName}
      />

      {showSignaturePad && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated p-6 max-w-lg w-full">
            <h3 className="text-sm font-semibold text-navy-700 mb-4">
              Draw Signature
            </h3>
            <SignaturePad
              onSave={handleSignatureSave}
              onCancel={() => {
                setShowSignaturePad(false);
                setPendingPlacement(null);
                setActiveMode("cursor");
              }}
            />
          </div>
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1">
        <PdfPageRenderer
          fileUrl={fileUrl}
          scale={zoom}
          onDocumentLoad={handleDocumentLoad}
          onPageInView={handlePageInView}
          annotations={annotations}
          activeMode={activeMode}
          pageDims={pageDims}
          onPageDims={handlePageDims}
          onPlaceAnnotation={handlePlaceAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          onMoveAnnotation={handleMoveAnnotation}
        />
      </div>
    </div>
  );
}
