"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { checkTransparency } from "@/lib/documents/check-transparency";

interface SignatureUploadProps {
  onSave: (dataUrl: string, label: string) => void;
  onCancel: () => void;
}

export function SignatureUpload({ onSave, onCancel }: SignatureUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [hasTransparency, setHasTransparency] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/png")) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setPreview(dataUrl);
        setChecking(true);
        const transparent = await checkTransparency(dataUrl);
        setHasTransparency(transparent);
        setChecking(false);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleSave = useCallback(() => {
    if (!preview || !label.trim()) return;
    onSave(preview, label.trim());
  }, [preview, label, onSave]);

  return (
    <div className="space-y-4">
      {!preview ? (
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-navy-300 hover:bg-navy-50/30 transition-all p-8 flex flex-col items-center gap-2"
          >
            <svg
              className="h-8 w-8 text-slate-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <span className="text-sm font-medium text-slate-500">
              Select a PNG file
            </span>
            <span className="text-xs text-slate-400">
              Transparent background recommended
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,image/png"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className="rounded-xl border border-slate-200 p-4 flex items-center justify-center"
            style={{
              backgroundImage:
                'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjFmNWY5Ii8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmMWY1ZjkiLz48L3N2Zz4=")',
            }}
          >
            <Image
              src={preview}
              alt="Signature preview"
              width={300}
              height={120}
              className="max-h-[100px] w-auto object-contain"
              unoptimized
            />
          </div>

          {checking && (
            <p className="text-xs text-slate-400">
              Checking transparency...
            </p>
          )}

          {hasTransparency === false && !checking && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-sm text-amber-700">
                This image doesn&apos;t appear to have a transparent
                background. It may not look right on documents.
              </p>
            </div>
          )}

          <div>
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
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        {preview && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPreview(null);
              setLabel("");
              setHasTransparency(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            Choose Different File
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!preview || !label.trim()}
          >
            Save Signature
          </Button>
        </div>
      </div>
    </div>
  );
}
