"use client";

import type { UploadedFile } from "@/app/admin/training/types";

const ACCEPT = ".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadZoneProps {
  uploadedFile: UploadedFile | null;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
}

export function FileUploadZone({
  uploadedFile,
  uploading,
  fileInputRef,
  onDrop,
  onFileSelect,
  onRemove,
}: FileUploadZoneProps) {
  if (uploadedFile) {
    return (
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">File</label>
        <div className="flex items-center gap-3 border border-slate-200 rounded-lg p-3">
          <svg className="h-5 w-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-navy-700 truncate">{uploadedFile.name}</p>
            {uploadedFile.size > 0 && (
              <p className="text-xs text-slate-400">{formatFileSize(uploadedFile.size)}</p>
            )}
          </div>
          <button onClick={onRemove} className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" aria-label="Remove file">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs font-medium text-slate-500 mb-1 block">File</label>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-navy-400 transition-colors cursor-pointer"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Uploading...</p>
          </div>
        ) : (
          <>
            <svg className="h-8 w-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-slate-500">Drag &amp; drop a file or click to browse</p>
            <p className="text-xs text-slate-400 mt-1">PDF (25MB), XLSX/XLS (10MB), DOCX/DOC (10MB), PNG/JPG (5MB)</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
