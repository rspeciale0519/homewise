"use client";

import {
  mailClassLabel,
  productTypeLabel,
  workflowLabel,
  type MailClass,
  type ProductType,
} from "@/lib/direct-mail/constants";
import type { DraftState } from "@/lib/direct-mail/types";

export function StepReview({
  draft,
  onChange,
  errors,
}: {
  draft: DraftState;
  onChange: (patch: Partial<DraftState>) => void;
  errors: Partial<Record<string, string>>;
}) {
  const ra = draft.returnAddress;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-serif text-xl font-semibold text-navy-700 mb-1">Review &amp; submit</h2>
        <p className="text-sm text-slate-500">
          Make sure everything looks right. Submitting sends your order to YLS — you&apos;ll get
          proofs and an invoice via email within 1 business day.
        </p>
      </div>

      <dl className="rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden bg-white text-sm">
        <Row label="Campaign type" value={workflowLabel(draft.workflow)} />
        {draft.subjectPropertyAddress && (
          <Row label="Subject property" value={draft.subjectPropertyAddress} />
        )}
        {draft.campaignName && <Row label="Campaign name" value={draft.campaignName} />}
        <Row
          label="Product"
          value={
            draft.productType
              ? `${productTypeLabel(draft.productType as ProductType)}${draft.productSize ? ` · ${draft.productSize}` : ""}`
              : "—"
          }
        />
        <Row label="Mail class" value={draft.mailClass ? mailClassLabel(draft.mailClass as MailClass) : "—"} />
        <Row label="Drop date" value={draft.dropDate ?? "—"} />
        <Row
          label="Return address"
          value={
            ra
              ? `${ra.name} · ${ra.address1}${ra.address2 ? `, ${ra.address2}` : ""}, ${ra.city}, ${ra.state} ${ra.zip}`
              : "—"
          }
        />
        <Row
          label="Artwork files"
          value={artworkSummary(draft)}
        />
        <Row
          label="Mailing list"
          value={
            draft.listFileKey
              ? `${draft.listRowCount.toLocaleString()} recipients`
              : "—"
          }
        />
        <Row label="Quantity" value={draft.quantity.toLocaleString()} />
        {draft.specialInstructions && (
          <Row label="Special instructions" value={draft.specialInstructions} />
        )}
      </dl>

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={draft.complianceConfirmed}
          onChange={(e) => onChange({ complianceConfirmed: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-crimson-600 focus:ring-crimson-500"
        />
        <span className="text-sm text-slate-700">
          I confirm the artwork I&apos;m submitting meets my brokerage&apos;s compliance
          requirements (logo, license #, equal-housing logo, etc.).
        </span>
      </label>
      {errors.complianceConfirmed && (
        <p className="text-xs text-crimson-600">{errors.complianceConfirmed}</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400 sm:w-44 shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-navy-700 break-words whitespace-pre-line">{value}</dd>
    </div>
  );
}

function artworkSummary(draft: DraftState): string {
  const completed = draft.artworkRows.filter(
    (r) => r.upload && r.name.trim().length > 0,
  );
  if (completed.length === 0) return "—";
  return completed.map((r) => `• ${r.name} (${r.upload!.fileName})`).join("\n");
}
