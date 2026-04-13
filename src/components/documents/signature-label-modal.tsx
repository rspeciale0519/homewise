"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

interface SignatureLabelModalProps {
  title: string;
  onSave: (label: string) => void;
  onCancel: () => void;
  saveText?: string;
  cancelText?: string;
}

export function SignatureLabelModal({
  title,
  onSave,
  onCancel,
  saveText = "Save",
  cancelText = "Skip",
}: SignatureLabelModalProps) {
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(() => {
    if (!label.trim()) return;
    setSaving(true);
    onSave(label.trim());
  }, [label, onSave]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-elevated p-6 animate-in fade-in-0 zoom-in-95">
        <p className="text-sm font-semibold text-navy-700 mb-4">{title}</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-navy-700 mb-1">
            Signature Label <span className="text-crimson-500">*</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder='e.g., "Full Signature", "Initials"'
            maxLength={50}
            className="w-full h-10 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === "Enter" && label.trim()) handleSave();
              if (e.key === "Escape") onCancel();
            }}
            autoFocus
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!label.trim() || saving}>
            {saving ? "Saving..." : saveText}
          </Button>
        </div>
      </div>
    </div>
  );
}
