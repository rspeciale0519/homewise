"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import {
  stepBasicsSchema,
  stepListSchema,
  stepReviewSchema,
  stepSpecSchema,
} from "@/lib/direct-mail/schemas";
import {
  ARTWORK_UPLOAD_CONCURRENCY,
  MAX_ARTWORK_FILES_PER_ORDER,
  type Workflow,
} from "@/lib/direct-mail/constants";
import type {
  ArtworkFile,
  ArtworkRow,
  DraftState,
  ListUploadResult,
} from "@/lib/direct-mail/types";
import { WizardShell } from "./wizard-shell";
import { StepBasics } from "./step-basics";
import { StepSpec } from "./step-spec";
import { StepArtwork } from "./step-artwork";
import { StepList } from "./step-list";
import { StepReview } from "./step-review";
import {
  createDraft,
  patchDraft,
  uploadArtworkWithProgress,
  uploadList,
} from "./client-api";

type Errors = Partial<Record<string, string>>;

function emptyDraft(workflow: Workflow): DraftState {
  return {
    id: "",
    currentStep: 1,
    workflow,
    subjectPropertyAddress: null,
    campaignName: null,
    productType: null,
    productSize: null,
    mailClass: null,
    dropDate: null,
    returnAddress: null,
    quantity: 0,
    listRowCount: 0,
    specialInstructions: null,
    artworkRows: [],
    listFileKey: null,
    complianceConfirmed: false,
  };
}

export function Wizard({
  initialWorkflow,
  initialDraft,
  defaultReturnAddress,
}: {
  initialWorkflow: Workflow;
  initialDraft: DraftState | null;
  defaultReturnAddress: DraftState["returnAddress"];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState>(
    initialDraft ?? {
      ...emptyDraft(initialWorkflow),
      returnAddress: defaultReturnAddress,
    },
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const orderIdRef = useRef<string>(initialDraft?.id ?? "");
  const pendingFilesRef = useRef<Map<string, File>>(new Map());

  async function ensureOrderId(): Promise<string> {
    if (orderIdRef.current) return orderIdRef.current;
    const { id } = await createDraft(draft.workflow);
    orderIdRef.current = id;
    setDraft((d) => ({ ...d, id }));
    return id;
  }

  function patchLocal(partial: Partial<DraftState>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  async function persist(partial: Partial<DraftState>): Promise<void> {
    const id = await ensureOrderId();
    await patchDraft(id, partialToServer({ ...draft, ...partial }));
  }

  async function handleNext() {
    setPipelineError(null);
    setBusy(true);
    try {
      const stepErrors = validateStep(draft);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});

      const id = await ensureOrderId();
      const targetStep = draft.currentStep === 5 ? 5 : draft.currentStep + 1;

      if (draft.currentStep === 5) {
        await patchDraft(id, {
          ...partialToServer(draft),
          currentStep: 5,
        });
        const submitRes = await fetch(`/api/direct-mail/orders/${id}/submit`, {
          method: "POST",
        });
        if (!submitRes.ok) {
          const j = await submitRes.json().catch(() => ({}));
          throw new Error(j.error ?? "Submission failed");
        }
        router.push(`/dashboard/direct-mail/orders/${id}?just_submitted=1`);
        return;
      }

      await patchDraft(id, {
        ...partialToServer(draft),
        currentStep: targetStep,
      });
      patchLocal({ currentStep: targetStep });
    } catch (e) {
      setPipelineError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleBack() {
    if (draft.currentStep === 1) return;
    setBusy(true);
    setPipelineError(null);
    try {
      const id = await ensureOrderId();
      const targetStep = draft.currentStep - 1;
      await patchDraft(id, { currentStep: targetStep });
      patchLocal({ currentStep: targetStep });
      setErrors({});
    } catch (e) {
      setPipelineError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveExit() {
    const pendingCount = draft.artworkRows.filter(
      (r) => r.status === "pending" || r.status === "failed",
    ).length;
    if (pendingCount > 0) {
      const ok = window.confirm(
        `You have ${pendingCount} file${pendingCount === 1 ? "" : "s"} that haven't finished uploading. Save & exit will discard them. Continue?`,
      );
      if (!ok) return;
    }
    setBusy(true);
    setPipelineError(null);
    try {
      if (orderIdRef.current) {
        await patchDraft(orderIdRef.current, partialToServer(draft));
      }
      router.push("/dashboard/direct-mail");
    } catch (e) {
      setPipelineError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function handleAddFiles(files: File[]) {
    if (files.length === 0) return;
    setDraft((d) => {
      const remainingSlots = MAX_ARTWORK_FILES_PER_ORDER - d.artworkRows.length;
      const accepted = files.slice(0, Math.max(0, remainingSlots));
      const newRows: ArtworkRow[] = accepted.map((f) => {
        const id = nanoid(12);
        pendingFilesRef.current.set(id, f);
        return {
          id,
          name: defaultNameFromFilename(f.name),
          status: "pending",
          localFile: { fileName: f.name, byteSize: f.size, mimeType: f.type },
          upload: null,
          progress: 0,
          lastError: null,
        };
      });
      return { ...d, artworkRows: [...d.artworkRows, ...newRows] };
    });
  }

  function handleArtworkRename(artworkId: string, name: string) {
    setDraft((d) => ({
      ...d,
      artworkRows: d.artworkRows.map((r) => (r.id === artworkId ? { ...r, name } : r)),
    }));
  }

  async function handleRemoveRow(artworkId: string) {
    const row = draft.artworkRows.find((r) => r.id === artworkId);
    setDraft((d) => ({
      ...d,
      artworkRows: d.artworkRows.filter((r) => r.id !== artworkId),
    }));
    pendingFilesRef.current.delete(artworkId);
    if (row?.status === "uploaded" && orderIdRef.current) {
      await patchDraft(orderIdRef.current, {
        artworkFiles: rowsToArtworkFiles(
          draft.artworkRows.filter((r) => r.id !== artworkId),
        ),
      }).catch(() => {});
    }
  }

  async function handleUploadAll() {
    setPipelineError(null);
    const id = await ensureOrderId();
    const queue = draft.artworkRows.filter(
      (r) => (r.status === "pending" || r.status === "failed") && r.name.trim().length > 0,
    );
    if (queue.length === 0) return;

    setUploading(true);

    setDraft((d) => ({
      ...d,
      artworkRows: d.artworkRows.map((r) =>
        queue.some((q) => q.id === r.id)
          ? { ...r, status: "uploading", progress: 0, lastError: null }
          : r,
      ),
    }));

    const queueRef = [...queue];
    const workers = Array.from({ length: ARTWORK_UPLOAD_CONCURRENCY }, async () => {
      while (queueRef.length > 0) {
        const next = queueRef.shift();
        if (!next) return;
        const file = pendingFilesRef.current.get(next.id);
        if (!file) {
          markRowFailed(next.id, "Local file lost — please re-add this file.");
          continue;
        }
        try {
          const { promise } = uploadArtworkWithProgress(id, next.id, file, (pct) => {
            setDraft((d) => ({
              ...d,
              artworkRows: d.artworkRows.map((r) =>
                r.id === next.id ? { ...r, progress: pct } : r,
              ),
            }));
          });
          const result = await promise;
          markRowUploaded(next.id, result);
          pendingFilesRef.current.delete(next.id);
        } catch (e) {
          markRowFailed(next.id, e instanceof Error ? e.message : "Upload failed");
        }
      }
    });

    await Promise.all(workers);
    setUploading(false);
    // The debounced effect on `draft` picks up the row state changes and
    // PATCHes the server with the new artworkFiles list automatically.
  }

  function markRowUploaded(artworkId: string, result: { fileKey: string; fileName: string; byteSize: number; mimeType: string; warnings: string[] }) {
    setDraft((d) => ({
      ...d,
      artworkRows: d.artworkRows.map((r) =>
        r.id === artworkId
          ? {
              ...r,
              status: "uploaded",
              progress: 100,
              localFile: null,
              lastError: null,
              upload: {
                fileKey: result.fileKey,
                fileName: result.fileName,
                byteSize: result.byteSize,
                mimeType: result.mimeType,
                warnings: result.warnings,
              },
            }
          : r,
      ),
    }));
  }

  function markRowFailed(artworkId: string, message: string) {
    setDraft((d) => ({
      ...d,
      artworkRows: d.artworkRows.map((r) =>
        r.id === artworkId
          ? { ...r, status: "failed", lastError: message }
          : r,
      ),
    }));
  }

  async function handleListUpload(file: File): Promise<ListUploadResult> {
    const id = await ensureOrderId();
    const result = await uploadList(id, file);
    const patch: Partial<DraftState> = {
      listFileKey: result.fileKey,
      listRowCount: result.rowCount,
      quantity: result.rowCount,
    };
    patchLocal(patch);
    await persist(patch);
    return result;
  }

  async function handleListRemove() {
    const patch: Partial<DraftState> = {
      listFileKey: null,
      listRowCount: 0,
      quantity: 0,
    };
    patchLocal(patch);
    await persist(patch);
  }

  const nextLabel = useMemo(() => {
    if (draft.currentStep === 5) return "Submit order";
    return "Continue →";
  }, [draft.currentStep]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!orderIdRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      patchDraft(orderIdRef.current, partialToServer(draft)).catch(() => {});
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft]);

  return (
    <WizardShell
      currentStep={draft.currentStep}
      onBack={handleBack}
      onNext={handleNext}
      onSaveExit={handleSaveExit}
      nextLabel={nextLabel}
      busy={busy || uploading}
      errorMessage={pipelineError}
    >
      {draft.currentStep === 1 && (
        <StepBasics draft={draft} onChange={patchLocal} errors={errors} />
      )}
      {draft.currentStep === 2 && (
        <StepSpec draft={draft} onChange={patchLocal} errors={errors} />
      )}
      {draft.currentStep === 3 && (
        <StepArtwork
          draft={draft}
          onAddFiles={handleAddFiles}
          onRename={handleArtworkRename}
          onRemoveRow={handleRemoveRow}
          onUploadAll={handleUploadAll}
          uploading={uploading}
          errors={errors}
        />
      )}
      {draft.currentStep === 4 && (
        <StepList
          draft={draft}
          onUpload={handleListUpload}
          onRemove={handleListRemove}
          onChange={patchLocal}
          errors={errors}
        />
      )}
      {draft.currentStep === 5 && (
        <StepReview draft={draft} onChange={patchLocal} errors={errors} />
      )}
    </WizardShell>
  );
}

function defaultNameFromFilename(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  const base = idx > 0 ? fileName.slice(0, idx) : fileName;
  return base.trim();
}

export function rowsToArtworkFiles(rows: ArtworkRow[]): ArtworkFile[] {
  return rows
    .filter((r) => r.status === "uploaded" && r.upload && r.name.trim().length > 0)
    .map((r) => ({
      id: r.id,
      name: r.name.trim(),
      fileKey: r.upload!.fileKey,
      fileName: r.upload!.fileName,
      byteSize: r.upload!.byteSize,
      mimeType: r.upload!.mimeType,
      warnings: r.upload!.warnings,
    }));
}

function validateStep(draft: DraftState): Errors {
  switch (draft.currentStep) {
    case 1: {
      const r = stepBasicsSchema.safeParse({
        workflow: draft.workflow,
        subjectPropertyAddress: draft.subjectPropertyAddress,
        campaignName: draft.campaignName,
      });
      return r.success ? {} : zodToErrors(r.error.issues);
    }
    case 2: {
      const r = stepSpecSchema.safeParse({
        productType: draft.productType,
        productSize: draft.productSize,
        mailClass: draft.mailClass,
        dropDate: draft.dropDate,
        returnAddress: draft.returnAddress,
        specialInstructions: draft.specialInstructions,
      });
      return r.success ? {} : zodToErrors(r.error.issues);
    }
    case 3: {
      const errs: Errors = {};
      const uploadedCount = draft.artworkRows.filter(
        (r) => r.status === "uploaded" && r.name.trim().length > 0,
      ).length;
      const pending = draft.artworkRows.filter(
        (r) => r.status === "pending" || r.status === "failed",
      );
      const uploadingNow = draft.artworkRows.some((r) => r.status === "uploading");
      const namelessUploaded = draft.artworkRows.findIndex(
        (r) => r.status === "uploaded" && r.name.trim().length === 0,
      );

      if (uploadingNow) {
        errs.artworkFiles = "Uploads are still in progress — please wait.";
        return errs;
      }
      if (namelessUploaded >= 0) {
        errs[`artworkFiles.${namelessUploaded}`] =
          "This file is missing a description.";
        return errs;
      }
      if (pending.length > 0) {
        errs.artworkFiles = `${pending.length} file${pending.length === 1 ? "" : "s"} not yet uploaded. Click "Upload all files" or remove them.`;
        return errs;
      }
      if (uploadedCount === 0) {
        errs.artworkFiles = "Add at least one artwork file.";
        return errs;
      }
      return {};
    }
    case 4: {
      const r = stepListSchema.safeParse({
        listFileKey: draft.listFileKey,
        listRowCount: draft.listRowCount,
        quantity: draft.quantity,
      });
      return r.success ? {} : zodToErrors(r.error.issues);
    }
    case 5: {
      const r = stepReviewSchema.safeParse({
        complianceConfirmed: draft.complianceConfirmed,
      });
      return r.success ? {} : zodToErrors(r.error.issues);
    }
    default:
      return {};
  }
}

function zodToErrors(issues: Array<{ path: (string | number)[]; message: string }>): Errors {
  const out: Errors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    out[key] = issue.message;
  }
  return out;
}

function partialToServer(d: Partial<DraftState>) {
  return {
    workflow: d.workflow,
    subjectPropertyAddress: d.subjectPropertyAddress,
    campaignName: d.campaignName,
    productType: d.productType,
    productSize: d.productSize,
    mailClass: d.mailClass,
    dropDate: d.dropDate,
    returnAddress: d.returnAddress,
    quantity: d.quantity,
    listRowCount: d.listRowCount,
    specialInstructions: d.specialInstructions,
    artworkFiles: d.artworkRows ? rowsToArtworkFiles(d.artworkRows) : undefined,
    listFileKey: d.listFileKey,
    complianceConfirmed: d.complianceConfirmed,
  };
}
