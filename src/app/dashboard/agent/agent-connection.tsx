"use client";

import { useRouter } from "next/navigation";

interface AgentConnectionProps {
  currentAgentId: string;
}

export function AgentConnection({ currentAgentId }: AgentConnectionProps) {
  const router = useRouter();

  const handleDisconnect = async () => {
    await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: "", lastName: "", preferredAgent: null }),
    });
    router.refresh();
  };

  void currentAgentId;

  return (
    <button
      onClick={handleDisconnect}
      className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-500 hover:text-crimson-600 hover:border-crimson-200 hover:bg-crimson-50 transition-all"
    >
      Change Agent
    </button>
  );
}
