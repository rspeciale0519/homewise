"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

interface PipelineContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  score: number;
  stage: string;
  type: string;
  assignedAgent: { id: string; firstName: string; lastName: string } | null;
  tags: { tag: { id: string; name: string; color: string } }[];
}

interface PipelineStage {
  key: string;
  label: string;
  color: string;
  contacts: PipelineContact[];
  totalValue: number;
}

interface PipelineBoardProps {
  stages: PipelineStage[];
}

export function PipelineBoard({ stages }: PipelineBoardProps) {
  const router = useRouter();

  const handleDrop = async (contactId: string, newStage: string) => {
    await fetch(`/api/admin/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    router.refresh();
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => (
        <div
          key={stage.key}
          className="min-w-[280px] w-[280px] shrink-0"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const contactId = e.dataTransfer.getData("contactId");
            if (contactId) handleDrop(contactId, stage.key);
          }}
        >
          {/* Column header */}
          <div className="flex items-center gap-2 mb-3">
            <div className={`h-3 w-3 rounded-full ${stage.color}`} />
            <h3 className="text-sm font-semibold text-navy-700">{stage.label}</h3>
            <span className="text-xs text-slate-400 ml-auto">{stage.contacts.length}</span>
          </div>
          {stage.totalValue > 0 && (
            <p className="text-xs text-slate-400 mb-2">{formatPrice(stage.totalValue)} pipeline</p>
          )}

          {/* Cards */}
          <div className="space-y-2">
            {stage.contacts.map((contact) => (
              <div
                key={contact.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("contactId", contact.id)}
                className="bg-white rounded-lg border border-slate-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
              >
                <Link href={`/admin/contacts/${contact.id}`} className="block">
                  <p className="text-sm font-semibold text-navy-700">
                    {contact.firstName} {contact.lastName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{contact.email}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1">
                      {contact.tags.slice(0, 2).map((ct) => (
                        <span
                          key={ct.tag.id}
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                          style={{ backgroundColor: ct.tag.color }}
                        >
                          {ct.tag.name}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs font-medium text-navy-600">{contact.score}pts</span>
                  </div>
                  {contact.assignedAgent && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      {contact.assignedAgent.firstName} {contact.assignedAgent.lastName}
                    </p>
                  )}
                </Link>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
