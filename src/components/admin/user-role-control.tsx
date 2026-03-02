"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const ROLES = ["user", "agent", "admin"] as const;
const ROLE_COLORS: Record<string, string> = {
  user: "bg-slate-100 text-slate-600 border-slate-200",
  agent: "bg-navy-50 text-navy-700 border-navy-200",
  admin: "bg-crimson-50 text-crimson-700 border-crimson-200",
};

interface UserRoleControlProps {
  userId: string;
  currentRole: string;
  isSelf: boolean;
}

export function UserRoleControl({ userId, currentRole, isSelf }: UserRoleControlProps) {
  const [role, setRole] = useState(currentRole);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (newRole: string) => {
    if (newRole === role) return;
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        setRole(newRole);
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to update role.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => handleChange(r)}
            disabled={saving || (isSelf && r !== "admin")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide border transition-all",
              role === r
                ? ROLE_COLORS[r]
                : "bg-white text-slate-400 border-slate-100 hover:border-slate-200",
              (saving || (isSelf && r !== "admin")) && "opacity-50 cursor-not-allowed"
            )}
          >
            {r}
          </button>
        ))}
      </div>
      {isSelf && (
        <p className="text-[10px] text-slate-400">You cannot change your own admin role.</p>
      )}
      {error && (
        <p className="text-xs text-crimson-600">{error}</p>
      )}
    </div>
  );
}
