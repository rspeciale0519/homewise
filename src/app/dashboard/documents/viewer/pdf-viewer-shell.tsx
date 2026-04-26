"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ViewerToolbar } from "@/components/documents/viewer-toolbar";
import { PdfPageRenderer } from "@/components/documents/pdf-page-renderer";
import { SignaturePad } from "@/components/documents/signature-pad";
import { EmailDialog } from "@/components/documents/email-dialog";
import { SignatureLabelModal } from "@/components/documents/signature-label-modal";
import { useTrackDocumentView } from "@/hooks/use-track-document-view";
import { useSignatureActions } from "@/hooks/use-signature-actions";
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
  FormValues,
  PageDimensions,
  PdfDocumentHandle,
} from "@/types/document-viewer";

interface PdfViewerShellProps {
  documentPath: string;
  documentId: string | null;
  documentName: string;
  fileUrl: string;
  agentInfo: AgentInfo;
  savedSignatures: Array<{ id: string; label: string; imageData: string }>;
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
  documentId,
  documentName,
  fileUrl,
  agentInfo,
  savedSignatures,
}: PdfViewerShellProps) {
  const [zoom, setZoom] = useState(1.5);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PdfDocumentHandle | null>(null);

  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeMode, setActiveMode] = useState<AnnotationMode>("cursor");
  const [selectedContact, setSelectedContact] = useState<ContactOption | null>(null);
  const [pageDims, setPageDims] = useState<Map<number, PageDimensions>>(new Map());

  // Pending placement state (used by signature/agent/contact picker flows)
  const [pendingPlacement, setPendingPlacement] = useState<{
    pageIndex: number;
    pdfX: number;
    pdfY: number;
  } | null>(null);

  const addAnnotation = useCallback(
    (annotation: Annotation) => setAnnotations((prev) => [...prev, annotation]),
    []
  );

  // Signature state (extracted hook)
  const {
    showSavePrompt,
    pendingUploadImage,
    savedSigs,
    showSignaturePad,
    handleSelectSignature,
    handleDrawNewSignature,
    handleUploadSignature,
    handleUploadLabelSave,
    handleUploadLabelCancel,
    handleSignatureSave,
    handleSaveToProfile,
    handleSkipSavePrompt,
    handleCancelSignaturePad,
    placeSignatureOnPage,
  } = useSignatureActions({
    savedSignatures,
    setActiveMode,
    pendingPlacement,
    setPendingPlacement,
    addAnnotation,
    genId,
  });
  const [pendingAgentField, setPendingAgentField] = useState<AgentFieldKey | null>(null);
  const [pendingContactField, setPendingContactField] = useState<ContactFieldKey | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Track document view
  useTrackDocumentView(documentPath, documentName, documentId);

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
          documentId,
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
  }, [isDirty, annotations, documentPath, documentId, documentName, selectedContact]);

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
        body: JSON.stringify({ documentPath, documentId, documentName }),
      }).catch(() => setIsFavorite(false));
    } else {
      await fetch("/api/documents/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentPath, documentId }),
      }).catch(() => setIsFavorite(true));
    }
  }, [isFavorite, documentPath, documentId, documentName]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleZoomFit = useCallback(() => {
    setZoom(1);
  }, []);

  const handleDocumentLoad = useCallback((pdf: PdfDocumentHandle) => {
    pdfDocRef.current = pdf;
    setNumPages(pdf.numPages);
  }, []);

  const collectFormValues = useCallback(async (): Promise<FormValues> => {
    const pdf = pdfDocRef.current;
    if (!pdf) return {};

    const storage = new Map<string, { value?: unknown }>();
    for (const [key, entry] of pdf.annotationStorage as Iterable<
      [unknown, unknown]
    >) {
      if (typeof key === "string" && entry && typeof entry === "object") {
        storage.set(key, entry as { value?: unknown });
      }
    }
    if (storage.size === 0) return {};

    const fieldObjects = await pdf.getFieldObjects().catch(() => null);
    if (!fieldObjects) return {};

    const values: FormValues = {};
    for (const [fieldName, objects] of Object.entries(fieldObjects)) {
      for (const obj of objects as Array<{ id: string }>) {
        const entry = storage.get(obj.id);
        if (!entry) continue;
        const raw = entry.value;
        if (raw === undefined || raw === null) continue;
        if (
          typeof raw === "string" ||
          typeof raw === "boolean" ||
          (Array.isArray(raw) && raw.every((v) => typeof v === "string"))
        ) {
          values[fieldName] = raw as FormValues[string];
          break;
        }
      }
    }
    return values;
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
      if (activeMode === "signature") {
        placeSignatureOnPage(pageIndex, pdfX, pdfY);
      } else if (activeMode === "agent-field" && pendingAgentField) {
        const value = resolveAgentField(pendingAgentField, agentInfo);
        if (value) {
          addAnnotation({
            id: genId(), pageIndex, pdfX, pdfY,
            type: "text", value, fontSize: 12, color: "#000000",
          });
        }
        setActiveMode("cursor");
        setPendingAgentField(null);
      } else if (activeMode === "contact-field" && pendingContactField && selectedContact) {
        const value = resolveContactField(pendingContactField, selectedContact);
        if (value) {
          addAnnotation({
            id: genId(), pageIndex, pdfX, pdfY,
            type: "text", value, fontSize: 12, color: "#000000",
          });
        }
        setActiveMode("cursor");
        setPendingContactField(null);
      }
    },
    [activeMode, placeSignatureOnPage, addAnnotation, agentInfo, selectedContact, pendingAgentField, pendingContactField]
  );

  const handleCreateTextAnnotation = useCallback(
    (pageIndex: number, pdfX: number, pdfY: number, value: string) => {
      addAnnotation({
        id: genId(), pageIndex, pdfX, pdfY,
        type: "text", value, fontSize: 12, color: "#000000",
      });
      setActiveMode("cursor");
    },
    [addAnnotation]
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

  const handleResizeAnnotation = useCallback(
    (id: string, width: number, height: number) => {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, width, height } : a))
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
      const formValues = await collectFormValues();
      const res = await fetch("/api/documents/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentPath, annotations, formValues, action: "download" }),
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
  }, [documentPath, documentName, annotations, collectFormValues]);

  const handlePrint = useCallback(async () => {
    setIsExporting(true);
    try {
      const formValues = await collectFormValues();
      const res = await fetch("/api/documents/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentPath,
          annotations,
          formValues,
          flatten: true,
          action: "download",
        }),
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
  }, [documentPath, annotations, collectFormValues]);

  const handleEmailSend = useCallback(
    async (to: string, subject: string, message: string) => {
      const formValues = await collectFormValues();
      const res = await fetch("/api/documents/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentPath,
          annotations,
          formValues,
          flatten: true,
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
    [documentPath, annotations, collectFormValues]
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
              documentId,
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
        savedSignatures={savedSigs}
        onSelectSignature={handleSelectSignature}
        onDrawNewSignature={handleDrawNewSignature}
        onUploadSignature={handleUploadSignature}
      />

      <EmailDialog
        open={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        onSend={handleEmailSend}
        documentName={documentName}
      />

      {showSavePrompt && (
        <SignatureLabelModal
          title="Save this signature to your profile?"
          onSave={handleSaveToProfile}
          onCancel={handleSkipSavePrompt}
        />
      )}

      {pendingUploadImage && (
        <SignatureLabelModal
          title="Name your uploaded signature"
          onSave={handleUploadLabelSave}
          onCancel={handleUploadLabelCancel}
          saveText="Save Signature"
          cancelText="Cancel"
        />
      )}

      {showSignaturePad && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated p-6 max-w-lg w-full">
            <h3 className="text-sm font-semibold text-navy-700 mb-4">
              Draw Signature
            </h3>
            <SignaturePad
              onSave={handleSignatureSave}
              onCancel={handleCancelSignaturePad}
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
          onCreateTextAnnotation={handleCreateTextAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          onMoveAnnotation={handleMoveAnnotation}
          onResizeAnnotation={handleResizeAnnotation}
        />
      </div>
    </div>
  );
}
