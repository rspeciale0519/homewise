"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { Pagination } from "@/components/ui/pagination";

interface ContactRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  source: string;
  type: string;
  stage: string;
  score: number;
  createdAt: string;
  assignedAgent: { id: string; firstName: string; lastName: string } | null;
  tags: { tag: { id: string; name: string; color: string } }[];
}

interface ContactsTableProps {
  contacts: ContactRow[];
  agents: { id: string; firstName: string; lastName: string }[];
  total: number;
  totalPages: number;
  currentPage: number;
  currentSearch?: string;
  currentStage?: string;
  currentSource?: string;
  currentType?: string;
  stages: string[];
  sources: string[];
  types: string[];
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  searching: "Searching",
  showing: "Showing",
  offer: "Offer",
  under_contract: "Under Contract",
  closed: "Closed",
  lost: "Lost",
};

const STAGE_COLORS: Record<string, string> = {
  new_lead: "bg-blue-100 text-blue-700",
  contacted: "bg-indigo-100 text-indigo-700",
  searching: "bg-purple-100 text-purple-700",
  showing: "bg-amber-100 text-amber-700",
  offer: "bg-orange-100 text-orange-700",
  under_contract: "bg-green-100 text-green-700",
  closed: "bg-emerald-100 text-emerald-700",
  lost: "bg-slate-100 text-slate-500",
};

export function ContactsTable({
  contacts,
  total,
  totalPages,
  currentPage,
  currentSearch,
  currentStage,
  currentSource,
  currentType,
  stages,
  sources,
  types,
}: ContactsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch ?? "");

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: search.trim() || undefined });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </form>

        <select
          value={currentStage ?? ""}
          onChange={(e) => updateParams({ stage: e.target.value || undefined })}
          className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg"
        >
          <option value="">All Stages</option>
          {stages.map((s) => <option key={s} value={s}>{STAGE_LABELS[s] ?? s}</option>)}
        </select>

        <select
          value={currentSource ?? ""}
          onChange={(e) => updateParams({ source: e.target.value || undefined })}
          className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg"
        >
          <option value="">All Sources</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={currentType ?? ""}
          onChange={(e) => updateParams({ type: e.target.value || undefined })}
          className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg"
        >
          <option value="">All Types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden transition-opacity ${isPending ? "opacity-50" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Stage</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Source</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Score</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Agent</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Tags</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No contacts found
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/admin/contacts/${contact.id}`} className="font-medium text-navy-700 hover:text-crimson-600 transition-colors">
                        {contact.firstName} {contact.lastName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{contact.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STAGE_COLORS[contact.stage] ?? "bg-slate-100 text-slate-600"}`}>
                        {STAGE_LABELS[contact.stage] ?? contact.stage}
                      </span>
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600">{contact.type}</td>
                    <td className="py-3 px-4 text-slate-600">{contact.source}</td>
                    <td className="py-3 px-4 font-medium text-navy-700">{contact.score}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {contact.assignedAgent
                        ? `${contact.assignedAgent.firstName} ${contact.assignedAgent.lastName}`
                        : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((ct) => (
                          <span
                            key={ct.tag.id}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                            style={{ backgroundColor: ct.tag.color }}
                          >
                            {ct.tag.name}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {Math.min((currentPage - 1) * 25 + 1, total)}–{Math.min(currentPage * 25, total)} of {total}
        </p>
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      </div>
    </div>
  );
}
