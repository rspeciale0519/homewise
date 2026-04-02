"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AvatarCropModal } from "./avatar-crop-modal";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  onAvatarChange: (url: string | null) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_RAW_SIZE = 5 * 1024 * 1024; // 5MB before crop

export function AvatarUpload({
  avatarUrl,
  firstName,
  lastName,
  onAvatarChange,
}: AvatarUploadProps) {
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndOpen = useCallback((file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_RAW_SIZE) {
      toast.error("Image must be under 5MB.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndOpen(file);
    },
    [validateAndOpen]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndOpen(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [validateAndOpen]
  );

  const handleCropComplete = async (blob: Blob) => {
    setCropSrc(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", blob, "avatar.webp");

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Upload failed");
      }

      const { avatarUrl: newUrl } = await res.json();
      onAvatarChange(newUrl);
      toast.success("Profile photo updated!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload photo. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Delete failed");
      }

      onAvatarChange(null);
      toast.success("Profile photo removed.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove photo. Please try again."
      );
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-5" id="avatar">
      {/* Avatar with hover overlay */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        disabled={uploading}
        className={cn(
          "group relative rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy-600 focus:ring-offset-2",
          dragOver && "ring-2 ring-navy-500 ring-offset-2 scale-[1.02]"
        )}
        aria-label="Upload profile photo"
      >
        <UserAvatar
          avatarUrl={avatarUrl}
          firstName={firstName}
          lastName={lastName}
          size="lg"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-2xl bg-navy-900/0 group-hover:bg-navy-900/50 transition-colors duration-200 flex flex-col items-center justify-center gap-1">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center gap-1">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <span className="text-[11px] font-medium text-white">
              {avatarUrl ? "Change Photo" : "Upload Photo"}
            </span>
          </div>
        </div>

        {/* Upload spinner */}
        {uploading && (
          <div className="absolute inset-0 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
          </div>
        )}
      </button>

      {/* Text + actions */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-navy-700">Profile Photo</p>
        <p className="text-xs text-slate-400">
          JPEG, PNG, or WebP &middot; Max 5 MB
        </p>
        {avatarUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="text-xs text-crimson-600 hover:text-crimson-700 font-medium mt-1 self-start transition-colors disabled:opacity-50"
          >
            {removing ? "Removing..." : "Remove photo"}
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        id="avatar-file-input"
        name="avatar-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="sr-only"
        aria-label="Upload profile photo"
      />

      {/* Crop modal */}
      {cropSrc && (
        <AvatarCropModal
          open={!!cropSrc}
          onClose={() => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }}
          imageSrc={cropSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
