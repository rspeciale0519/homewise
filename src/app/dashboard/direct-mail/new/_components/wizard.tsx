"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  stepArtworkSchema,
  stepBasicsSchema,
  stepListSchema,
  stepReviewSchema,
  stepSpecSchema,
} from "@/lib/direct-mail/schemas";
import type { Workflow } from "@/lib/direct-mail/constants";
import type { DraftState, ListUploadResult } from "@/lib/direct-mail/types";
import { WizardShell } from "./wizard-shell";
import { StepBasics } from "./step-basics";
import { StepSpec } from "./step-spec";
import { StepArtwork } from "./step-artwork";
import { StepList } from "./step-list";
import { StepReview } from "./step-review";
import type { ArtworkUploadResult } from "@/lib/direct-mail/types";
import {
  createDraft,
  patchDraft,
  uploadArtwork,
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
    frontFileKey: null,
    backFileKey: null,
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
  const [errors, setErrors] = useState<Errors>({});
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const orderIdRef = useRef<string>(initialDraft?.id ?? "");

  // Lazily create the draft order on first interaction
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
    await patchDraft(id, partialToServer(partial));
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

  async function handleArtworkUpload(
    slot: "front" | "back",
    file: File,
  ): Promise<ArtworkUploadResult> {
    const id = await ensureOrderId();
    const result = await uploadArtwork(id, slot, file);
    const patch: Partial<DraftState> =
      slot === "front"
        ? { frontFileKey: result.fileKey }
        : { backFileKey: result.fileKey };
    patchLocal(patch);
    await persist(patch);
    return result;
  }

  async function handleArtworkRemove(slot: "front" | "back") {
    const patch: Partial<DraftState> =
      slot === "front" ? { frontFileKey: null } : { backFileKey: null };
    patchLocal(patch);
    await persist(patch);
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

  // Persist field-level edits with a debounce
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
      busy={busy}
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
          onUpload={handleArtworkUpload}
          onRemove={handleArtworkRemove}
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
      const r = stepArtworkSchema.safeParse({
        frontFileKey: draft.frontFileKey,
        backFileKey: draft.backFileKey,
      });
      return r.success ? {} : zodToErrors(r.error.issues);
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
    frontFileKey: d.frontFileKey,
    backFileKey: d.backFileKey,
    listFileKey: d.listFileKey,
    complianceConfirmed: d.complianceConfirmed,
  };
}
