"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { WORKFLOWS, workflowLabel, type Workflow } from "@/lib/direct-mail/constants";
import type { DraftState } from "@/lib/direct-mail/types";

const WORKFLOW_OPTIONS = WORKFLOWS.map((w) => ({ value: w, label: workflowLabel(w) }));

export function StepBasics({
  draft,
  onChange,
  errors,
}: {
  draft: DraftState;
  onChange: (patch: Partial<DraftState>) => void;
  errors: Partial<Record<string, string>>;
}) {
  const w = draft.workflow;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-semibold text-navy-700 mb-1">Order basics</h2>
        <p className="text-sm text-slate-500">
          Pick the campaign type. We&apos;ll tailor the rest of the wizard to it.
        </p>
      </div>

      <Select
        label="Campaign type"
        required
        options={WORKFLOW_OPTIONS}
        value={w}
        onValueChange={(v) => onChange({ workflow: v as Workflow })}
        error={errors.workflow}
      />

      {(w === "just_sold" || w === "just_listed") && (
        <Input
          label={w === "just_sold" ? "Subject property address (recently sold)" : "Subject property address (just listed)"}
          placeholder="e.g., 123 Oak Lane, Lake Mary, FL 32746"
          value={draft.subjectPropertyAddress ?? ""}
          onChange={(e) => onChange({ subjectPropertyAddress: e.target.value })}
          error={errors.subjectPropertyAddress}
          hint="Optional — used in the order summary so YLS knows what the campaign is about."
        />
      )}

      {w === "farm" && (
        <Input
          label="Campaign name"
          placeholder="e.g., March Farm — Lake Mary"
          value={draft.campaignName ?? ""}
          onChange={(e) => onChange({ campaignName: e.target.value })}
          error={errors.campaignName}
          hint="Optional — helpful for organizing repeat farming campaigns."
        />
      )}
    </div>
  );
}
