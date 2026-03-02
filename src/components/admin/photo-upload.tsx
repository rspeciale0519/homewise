"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
  currentUrl: string;
  firstName: string;
  lastName: string;
  onUploadComplete: (url: string) => void;
}

export function PhotoUpload({
  currentUrl,
  firstName,
  lastName,
  onUploadComplete,
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = preview ?? currentUrl;
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "";

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Please upload a JPEG, PNG, or WebP image.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be under 5 MB.");
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Upload failed");
        }

        const { url } = await res.json();
        onUploadComplete(url);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Upload failed. Try again."
        );
        setPreview(null);
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile]
  );

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Portrait frame */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "group relative w-48 aspect-[3/4] rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer",
          "ring-2 ring-offset-2 ring-offset-slate-50",
          dragOver
            ? "ring-crimson-500 scale-[1.02] shadow-lg shadow-crimson-100"
            : displayUrl
              ? "ring-slate-200 hover:ring-navy-300"
              : "ring-dashed ring-slate-300 hover:ring-navy-400"
        )}
      >
        {/* Photo or placeholder */}
        {displayUrl ? (
          <>
            <Image
              src={displayUrl}
              alt={`${firstName} ${lastName}`.trim() || "Agent photo"}
              fill
              className="object-cover object-top"
              sizes="192px"
              unoptimized={preview !== null}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-navy-900/0 group-hover:bg-navy-900/50 transition-colors duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center gap-1.5">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                  />
                </svg>
                <span className="text-xs font-medium text-white">
                  Change Photo
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center gap-3 p-4">
            {initials ? (
              <span className="font-serif text-4xl font-bold text-slate-200 select-none">
                {initials}
              </span>
            ) : (
              <svg
                className="h-10 w-10 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            )}

            <div className="text-center">
              <svg
                className={cn(
                  "h-5 w-5 mx-auto mb-1 transition-colors",
                  dragOver ? "text-crimson-500" : "text-slate-400"
                )}
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
              <p className="text-xs font-medium text-slate-500">Upload Photo</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                or drag & drop
              </p>
            </div>
          </div>
        )}

        {/* Upload spinner */}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
          </div>
        )}
      </button>

      {/* File info */}
      <p className="text-[11px] text-slate-400 text-center">
        JPEG, PNG, or WebP &middot; Max 5 MB
      </p>

      {/* Error message */}
      {error && (
        <p className="text-xs text-crimson-600 text-center max-w-[200px]">
          {error}
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFileSelect}
        className="sr-only"
      />
    </div>
  );
}
