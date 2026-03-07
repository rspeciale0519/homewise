"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/admin/admin-toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { adminFetch } from "@/lib/admin-fetch";

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
}

interface RoutingRule {
  id: string;
  name: string;
  agentId: string;
  conditions: Record<string, unknown>;
  priority: number;
  roundRobin: boolean;
  active: boolean;
  createdAt: string;
}

interface RoutingData {
  rules: RoutingRule[];
  agents: Agent[];
}

const CONDITION_FIELDS = [
  { value: "source", label: "Lead Source", options: ["website", "referral", "zillow", "realtor.com", "social"] },
  { value: "type", label: "Contact Type", options: ["buyer", "seller", "both"] },
  { value: "city", label: "City", options: [] },
] as const;

export function LeadRoutingView() {
  const { toast } = useToast();
  const [data, setData] = useState<RoutingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoutingRule | null>(null);

  const refreshData = async () => {
    setLoading(true);
    try {
      const result = await adminFetch<RoutingData>("/api/admin/lead-routing");
      setData(result);
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await adminFetch<RoutingData>("/api/admin/lead-routing");
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) toast((err as Error).message, "error");
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [toast]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const condField = form.get("conditionField") as string;
    const condValue = form.get("conditionValue") as string;

    try {
      await adminFetch("/api/admin/lead-routing", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          agentId: form.get("agentId"),
          conditions: condField && condValue ? { [condField]: condValue } : {},
          priority: Number(form.get("priority") ?? 0),
          roundRobin: form.get("roundRobin") === "on",
        }),
      });
      toast("Rule created", "success");
      setShowForm(false);
      refreshData();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await adminFetch("/api/admin/lead-routing", {
        method: "PATCH",
        body: JSON.stringify({ id, active: !active }),
      });
      refreshData();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminFetch("/api/admin/lead-routing", {
        method: "DELETE",
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      toast("Rule deleted", "success");
      setDeleteTarget(null);
      refreshData();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const getAgentName = (agentId: string): string => {
    const agent = data?.agents.find((a) => a.id === agentId);
    return agent ? `${agent.firstName} ${agent.lastName}` : "Unknown";
  };

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Routing Rule"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Leads will no longer be routed by this rule.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 transition-colors"
        >
          + New Rule
        </button>
      </div>

      {showForm && data && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-semibold text-navy-700">New Routing Rule</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              name="name"
              required
              placeholder="Rule name (e.g. Tampa Buyers)"
              className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
            <select name="agentId" required className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600">
              <option value="">Assign to agent...</option>
              {data.agents.map((a) => (
                <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select name="conditionField" className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600">
              <option value="">Condition (optional)</option>
              {CONDITION_FIELDS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <input
              name="conditionValue"
              placeholder="Value (e.g. Tampa, buyer)"
              className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
            <input
              name="priority"
              type="number"
              defaultValue={0}
              placeholder="Priority (0=highest)"
              className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="roundRobin" id="roundRobin" className="rounded" />
            <label htmlFor="roundRobin" className="text-sm text-slate-600">Enable round-robin (distribute leads evenly among agents with this rule)</label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
          </div>
        </form>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {data && !loading && (
        <div className="space-y-3">
          {data.rules.map((rule) => (
            <div key={rule.id} className={`bg-white rounded-xl border p-4 sm:p-5 ${rule.active ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-navy-700">{rule.name}</h3>
                    {rule.roundRobin && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">Round Robin</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">Priority {rule.priority}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Assigns to <span className="font-medium text-navy-700">{getAgentName(rule.agentId)}</span>
                    {Object.keys(rule.conditions).length > 0 && (
                      <span> when {Object.entries(rule.conditions).map(([k, v]) => `${k} = ${String(v)}`).join(", ")}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(rule.id, rule.active)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      rule.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {rule.active ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(rule)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {data.rules.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <p className="text-slate-500">No routing rules configured yet.</p>
              <p className="text-sm text-slate-400 mt-1">Create a rule to automatically assign leads to agents.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
