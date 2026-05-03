"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { workflowLabel, productTypeLabel, type Workflow, type ProductType } from "@/lib/direct-mail/constants";

export type SubmittedRow = {
  id: string;
  workflow: string;
  productType: string | null;
  productSize: string | null;
  listRowCount: number;
  dropDate: string | null;
  submittedAt: string | null;
  emailStatus: string;
};

export type DraftRow = {
  id: string;
  workflow: string;
  currentStep: number;
  updatedAt: string;
};

export function OrderListView({
  submitted,
  drafts,
}: {
  submitted: SubmittedRow[];
  drafts: DraftRow[];
}) {
  const [tab, setTab] = useState<"submitted" | "drafts">("submitted");
  return (
    <div>
      <div className="mb-5 flex items-center gap-2 border-b border-slate-200">
        <TabButton active={tab === "submitted"} onClick={() => setTab("submitted")}>
          Submitted ({submitted.length})
        </TabButton>
        <TabButton active={tab === "drafts"} onClick={() => setTab("drafts")}>
          Drafts ({drafts.length})
        </TabButton>
      </div>
      {tab === "submitted" ? (
        <SubmittedTab rows={submitted} />
      ) : (
        <DraftsTab rows={drafts} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors " +
        (active
          ? "border-crimson-600 text-crimson-700"
          : "border-transparent text-slate-500 hover:text-navy-700")
      }
    >
      {children}
    </button>
  );
}

function SubmittedTab({ rows }: { rows: SubmittedRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate-500">No submitted orders yet.</p>
        <Link
          href="/dashboard/direct-mail"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-crimson-600 hover:text-crimson-700"
        >
          Start a campaign →
        </Link>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-2">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/dashboard/direct-mail/orders/${row.id}`}
            className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 hover:border-crimson-200 hover:shadow-sm transition-all"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy-700 truncate">
                {workflowLabel(row.workflow as Workflow)}
                {row.productType
                  ? ` · ${productTypeLabel(row.productType as ProductType)}${row.productSize ? ` ${row.productSize}` : ""}`
                  : ""}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {row.submittedAt ? formatStamp(row.submittedAt) : "—"}
                {" · "}
                {row.listRowCount.toLocaleString()} recipient{row.listRowCount === 1 ? "" : "s"}
                {row.dropDate ? ` · drop ${formatDate(row.dropDate)}` : ""}
              </p>
            </div>
            <StatusPill emailStatus={row.emailStatus} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DraftsTab({ rows }: { rows: DraftRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function discard(id: string) {
    if (!confirm("Discard this draft? You won't be able to recover it.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/direct-mail/orders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to discard");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to discard");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate-500">No drafts in progress.</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-navy-700 truncate">
              {workflowLabel(row.workflow as Workflow)} · Step {row.currentStep} of 5
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Last edited {formatStamp(row.updatedAt)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => discard(row.id)}
            disabled={busyId === row.id}
          >
            Discard
          </Button>
          <Link
            href={`/dashboard/direct-mail/new?workflow=${slugFor(row.workflow)}&draftId=${row.id}`}
            className="inline-flex h-8 items-center justify-center rounded-md bg-navy-600 px-4 text-xs font-medium text-white hover:bg-navy-700 transition-colors"
          >
            Continue
          </Link>
        </li>
      ))}
    </ul>
  );
}

function StatusPill({ emailStatus }: { emailStatus: string }) {
  const fallback = { label: "Submitted", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  const map: Record<string, { label: string; classes: string }> = {
    sent: fallback,
    none: fallback,
    pending: { label: "Sending…", classes: "bg-slate-100 text-slate-600 border-slate-200" },
    failed: { label: "Awaiting send", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  };
  const cfg = map[emailStatus] ?? fallback;
  return (
    <span
      className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
}

function slugFor(workflow: string): string {
  return workflow.replace(/_/g, "-");
}

function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}
