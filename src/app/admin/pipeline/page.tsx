import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PipelineBoard } from "./pipeline-board";

export const metadata: Metadata = { title: "Pipeline — Admin" };

const STAGES = [
  { key: "new_lead", label: "New Lead", color: "bg-blue-500" },
  { key: "contacted", label: "Contacted", color: "bg-indigo-500" },
  { key: "searching", label: "Searching", color: "bg-purple-500" },
  { key: "showing", label: "Showing", color: "bg-amber-500" },
  { key: "offer", label: "Offer", color: "bg-orange-500" },
  { key: "under_contract", label: "Under Contract", color: "bg-green-500" },
  { key: "closed", label: "Closed", color: "bg-emerald-500" },
  { key: "lost", label: "Lost", color: "bg-slate-400" },
];

export default async function PipelinePage() {
  const contacts = await prisma.contact.findMany({
    include: {
      assignedAgent: { select: { id: true, firstName: true, lastName: true } },
      tags: { include: { tag: true } },
      transactions: { select: { id: true, purchasePrice: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Group by stage
  const grouped = STAGES.map((stage) => ({
    ...stage,
    contacts: contacts.filter((c) => c.stage === stage.key),
    totalValue: contacts
      .filter((c) => c.stage === stage.key)
      .reduce((sum, c) => {
        const tx = c.transactions.find((t) => t.status === "active");
        return sum + (tx?.purchasePrice ?? 0);
      }, 0),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-700">Pipeline</h1>
        <p className="text-sm text-slate-500">
          {contacts.length} contacts across {STAGES.length} stages
        </p>
      </div>
      <PipelineBoard stages={grouped} />
    </div>
  );
}
