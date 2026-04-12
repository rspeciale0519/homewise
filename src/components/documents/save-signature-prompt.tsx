"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

interface SaveSignaturePromptProps {
  onSave: (label: string) => void;
  onSkip: () => void;
}

export function SaveSignaturePrompt({ onSave, onSkip }: SaveSignaturePromptProps) {
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(() => {
    if (!label.trim()) return;
    setSaving(true);
    onSave(label.trim());
  }, [label, onSave]);

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-elevated p-4 animate-in slide-in-from-bottom-4 fade-in-0">
      <p className="text-sm font-medium text-navy-700 mb-3">Save this signature to your profile?</p>
      <input
        type="text" value={label} onChange={(e) => setLabel(e.target.value)}
        placeholder='e.g., "Full Signature"' maxLength={50}
        className="w-full h-9 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent mb-3"
        onKeyDown={(e) => { if (e.key === "Enter" && label.trim()) handleSave(); }}
        autoFocus
      />
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
        <Button size="sm" onClick={handleSave} disabled={!label.trim() || saving}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </div>
  );
}
