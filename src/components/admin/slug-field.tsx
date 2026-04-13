"use client";

import { slugify, slugValidationError } from "@/lib/slug/slugify";

interface SlugFieldProps {
  value: string;
  onChange: (value: string) => void;
  onUserEdit?: () => void;
  title?: string;
  autoSync?: boolean;
  onResetAutoSync?: () => void;
  routePrefix: string;
  label?: string;
  error?: string | null;
  helperText?: string;
}

export function SlugField({
  value,
  onChange,
  onUserEdit,
  title,
  autoSync = false,
  onResetAutoSync,
  routePrefix,
  label = "URL Slug",
  error,
  helperText,
}: SlugFieldProps) {
  const validationError = error ?? (value ? slugValidationError(value) : null);
  const titleSlug = title ? slugify(title) : "";
  const canResetAutoSync =
    !autoSync && !!onResetAutoSync && !!titleSlug && titleSlug !== value;

  return (
    <div>
      <div className="flex items-center justify-between mb-1 min-h-[18px]">
        <label className="text-xs font-medium text-slate-500">{label}</label>
        {autoSync ? (
          <span className="text-[10px] uppercase tracking-wide font-semibold text-navy-600 bg-navy-50 px-1.5 py-0.5 rounded">
            Auto from title
          </span>
        ) : canResetAutoSync ? (
          <button
            type="button"
            onClick={onResetAutoSync}
            className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 hover:text-navy-600 transition-colors"
          >
            Reset to auto
          </button>
        ) : null}
      </div>
      <input
        value={value}
        onChange={(e) => {
          const next = e.target.value
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
          onChange(next);
          onUserEdit?.();
        }}
        spellCheck={false}
        autoComplete="off"
        placeholder="url-friendly-slug"
        className={`w-full h-10 px-3 text-sm font-mono rounded-lg border focus:outline-none focus:ring-2 transition-colors ${
          validationError
            ? "border-red-300 focus:ring-red-500"
            : "border-slate-200 focus:ring-navy-600"
        }`}
      />
      <div className="mt-1.5">
        {validationError ? (
          <p className="text-xs text-red-600">{validationError}</p>
        ) : value ? (
          <p className="text-xs font-mono truncate">
            <span className="text-slate-400">{routePrefix}</span>
            <span className="text-navy-600 font-semibold">{value}</span>
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            {helperText ?? "Lowercase letters, numbers, and hyphens only"}
          </p>
        )}
      </div>
    </div>
  );
}
