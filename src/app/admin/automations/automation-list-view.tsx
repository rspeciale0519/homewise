"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RuleItem {
  id: string;
  name: string;
  triggerType: string;
  conditions: Record<string, unknown>;
  actionType: string;
  actionData: Record<string, unknown>;
  active: boolean;
  createdAt: string;
}

interface Option {
  value: string;
  label: string;
}

interface AutomationListViewProps {
  rules: RuleItem[];
  triggerTypes: Option[];
  actionTypes: Option[];
}

export function AutomationListView({ rules, triggerTypes, actionTypes }: AutomationListViewProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState(triggerTypes[0]?.value ?? "");
  const [actionType, setActionType] = useState(actionTypes[0]?.value ?? "");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await fetch("/api/admin/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, triggerType, conditions: {}, actionType, actionData: {} }),
    });
    setName("");
    setIsCreating(false);
    router.refresh();
  };

  const triggerLabel = (val: string) => triggerTypes.find((t) => t.value === val)?.label ?? val;
  const actionLabel = (val: string) => actionTypes.find((t) => t.value === val)?.label ?? val;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 text-sm font-semibold text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors"
        >
          {isCreating ? "Cancel" : "New Rule"}
        </button>
      </div>

      {isCreating && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rule name"
              className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              {triggerTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              {actionTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button
              onClick={handleCreate}
              className="h-10 px-4 text-sm font-semibold text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${rule.active ? "bg-green-500" : "bg-slate-300"}`} />
                <div>
                  <h3 className="font-semibold text-navy-700 text-sm">{rule.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    When <span className="font-medium text-slate-700">{triggerLabel(rule.triggerType)}</span>
                    {" → "}
                    <span className="font-medium text-slate-700">{actionLabel(rule.actionType)}</span>
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rule.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                {rule.active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-500">No automation rules yet. Create your first rule to automate lead nurturing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
