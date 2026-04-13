"use client";

import { useCallback, useState } from "react";
import type { Annotation, AnnotationMode } from "@/types/document-viewer";

interface SavedSignature {
  id: string;
  label: string;
  imageData: string;
}

interface PendingPlacement {
  pageIndex: number;
  pdfX: number;
  pdfY: number;
}

interface UseSignatureActionsParams {
  savedSignatures: SavedSignature[];
  setActiveMode: (mode: AnnotationMode) => void;
  pendingPlacement: PendingPlacement | null;
  setPendingPlacement: (p: PendingPlacement | null) => void;
  addAnnotation: (annotation: Annotation) => void;
  genId: () => string;
}

interface UseSignatureActionsReturn {
  activeSignatureImage: string | null;
  setActiveSignatureImage: (image: string | null) => void;
  showSavePrompt: string | null;
  pendingUploadImage: string | null;
  savedSigs: SavedSignature[];
  showSignaturePad: boolean;
  setShowSignaturePad: (show: boolean) => void;
  handleSelectSignature: (imageData: string) => void;
  handleDrawNewSignature: () => void;
  handleUploadSignature: () => void;
  handleUploadLabelSave: (label: string) => Promise<void>;
  handleUploadLabelCancel: () => void;
  handleSignatureSave: (dataUrl: string) => void;
  handleSaveToProfile: (label: string) => Promise<void>;
  handleSkipSavePrompt: () => void;
  handleCancelSignaturePad: () => void;
  placeSignatureOnPage: (pageIndex: number, pdfX: number, pdfY: number) => void;
}

export function useSignatureActions({
  savedSignatures,
  setActiveMode,
  pendingPlacement,
  setPendingPlacement,
  addAnnotation,
  genId,
}: UseSignatureActionsParams): UseSignatureActionsReturn {
  const [activeSignatureImage, setActiveSignatureImage] = useState<string | null>(null);
  const [showSavePrompt, setShowSavePrompt] = useState<string | null>(null);
  const [pendingUploadImage, setPendingUploadImage] = useState<string | null>(null);
  const [savedSigs, setSavedSigs] = useState<SavedSignature[]>(savedSignatures);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const handleSelectSignature = useCallback(
    (imageData: string) => {
      setActiveSignatureImage(imageData);
      setActiveMode("signature");
    },
    [setActiveMode]
  );

  const handleDrawNewSignature = useCallback(() => {
    setActiveSignatureImage(null);
    setActiveMode("signature");
  }, [setActiveMode]);

  const handleUploadSignature = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".png,image/png";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPendingUploadImage(dataUrl);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  const handleUploadLabelSave = useCallback(
    async (label: string) => {
      if (!pendingUploadImage) return;
      try {
        const res = await fetch("/api/documents/signatures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, imageData: pendingUploadImage, source: "uploaded" }),
        });
        if (!res.ok) throw new Error("Failed to save");
        const { signature } = await res.json();
        setSavedSigs((prev) => [
          ...prev,
          { id: signature.id, label: signature.label, imageData: signature.imageData },
        ]);
        setActiveSignatureImage(pendingUploadImage);
        setActiveMode("signature");
      } catch { /* upload failed silently */ }
      setPendingUploadImage(null);
    },
    [pendingUploadImage, setActiveMode]
  );

  const handleUploadLabelCancel = useCallback(() => {
    setPendingUploadImage(null);
  }, []);

  const handleSaveToProfile = useCallback(
    async (label: string) => {
      if (!showSavePrompt) return;
      try {
        const res = await fetch("/api/documents/signatures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, imageData: showSavePrompt, source: "drawn" }),
        });
        if (res.ok) {
          const { signature } = await res.json();
          setSavedSigs((prev) => [
            ...prev,
            { id: signature.id, label: signature.label, imageData: signature.imageData },
          ]);
        }
      } catch { /* save failed silently */ }
      setShowSavePrompt(null);
    },
    [showSavePrompt]
  );

  const placeSignatureOnPage = useCallback(
    (pageIndex: number, pdfX: number, pdfY: number) => {
      const sigWidth = 150;
      const sigHeight = 60;
      if (activeSignatureImage) {
        addAnnotation({
          id: genId(),
          pageIndex,
          pdfX: pdfX - sigWidth / 2,
          pdfY: pdfY - sigHeight / 2,
          type: "signature",
          value: activeSignatureImage,
          fontSize: 12,
          color: "#000000",
          width: sigWidth,
          height: sigHeight,
        });
        setActiveMode("cursor");
        setActiveSignatureImage(null);
      } else {
        setPendingPlacement({ pageIndex, pdfX, pdfY });
        setShowSignaturePad(true);
      }
    },
    [activeSignatureImage, addAnnotation, genId, setActiveMode, setPendingPlacement]
  );

  const handleSignatureSave = useCallback(
    (dataUrl: string) => {
      if (pendingPlacement) {
        const sigWidth = 150;
        const sigHeight = 60;
        addAnnotation({
          id: genId(),
          pageIndex: pendingPlacement.pageIndex,
          pdfX: pendingPlacement.pdfX - sigWidth / 2,
          pdfY: pendingPlacement.pdfY - sigHeight / 2,
          type: "signature",
          value: dataUrl,
          fontSize: 12,
          color: "#000000",
          width: sigWidth,
          height: sigHeight,
        });
        setPendingPlacement(null);
      }
      setShowSignaturePad(false);
      setActiveMode("cursor");
      setShowSavePrompt(dataUrl);
    },
    [pendingPlacement, addAnnotation, genId, setPendingPlacement, setActiveMode]
  );

  const handleSkipSavePrompt = useCallback(() => {
    setShowSavePrompt(null);
  }, []);

  const handleCancelSignaturePad = useCallback(() => {
    setShowSignaturePad(false);
    setPendingPlacement(null);
    setActiveMode("cursor");
  }, [setPendingPlacement, setActiveMode]);

  return {
    activeSignatureImage,
    setActiveSignatureImage,
    showSavePrompt,
    pendingUploadImage,
    savedSigs,
    showSignaturePad,
    setShowSignaturePad,
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
  };
}
