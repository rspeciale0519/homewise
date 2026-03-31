"use client";

import { useState } from "react";
import { profileSchema, type ProfileInput } from "@/schemas/profile.schema";
import { cn } from "@/lib/utils";
import { AvatarUpload } from "@/components/profile/avatar-upload";

interface ProfileFormProps {
  initialData: ProfileInput;
  email: string;
  avatarUrl: string | null;
}

type FieldErrors = Partial<Record<keyof ProfileInput, string>>;

export function ProfileForm({ initialData, email, avatarUrl }: ProfileFormProps) {
  const [form, setForm] = useState<ProfileInput>(initialData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(avatarUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const result = profileSchema.safeParse(form);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const newErrors: FieldErrors = {};
      for (const [key, msgs] of Object.entries(flat)) {
        if (msgs?.[0]) newErrors[key as keyof ProfileInput] = msgs[0];
      }
      setErrors(newErrors);
      return;
    }

    setStatus("saving");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save");
      }

      setStatus("saved");
      setErrors({});
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar upload */}
      <div className="pb-5 border-b border-slate-100">
        <AvatarUpload
          avatarUrl={currentAvatarUrl}
          firstName={form.firstName}
          lastName={form.lastName}
          onAvatarChange={setCurrentAvatarUrl}
        />
      </div>

      {/* Email (read-only) */}
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full h-11 px-4 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-slate-400">Email cannot be changed here.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="profile-first" className="block text-sm font-medium text-navy-700 mb-1.5">
            First Name <span className="text-crimson-500">*</span>
          </label>
          <input
            id="profile-first"
            type="text"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            className={cn(
              "w-full h-11 px-4 text-sm bg-white border rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow",
              errors.firstName ? "border-crimson-300 focus:ring-crimson-500" : "border-slate-200 focus:ring-navy-600"
            )}
          />
          {errors.firstName && <p className="mt-1 text-xs text-crimson-600">{errors.firstName}</p>}
        </div>
        <div>
          <label htmlFor="profile-last" className="block text-sm font-medium text-navy-700 mb-1.5">
            Last Name <span className="text-crimson-500">*</span>
          </label>
          <input
            id="profile-last"
            type="text"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            className={cn(
              "w-full h-11 px-4 text-sm bg-white border rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow",
              errors.lastName ? "border-crimson-300 focus:ring-crimson-500" : "border-slate-200 focus:ring-navy-600"
            )}
          />
          {errors.lastName && <p className="mt-1 text-xs text-crimson-600">{errors.lastName}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="profile-phone" className="block text-sm font-medium text-navy-700 mb-1.5">
          Phone <span className="text-xs text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          id="profile-phone"
          type="tel"
          value={form.phone ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="w-full h-11 px-4 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-shadow"
          placeholder="(407) 555-0100"
        />
      </div>

      {serverError && (
        <div className="rounded-xl bg-crimson-50 border border-crimson-200 px-4 py-3">
          <p className="text-sm text-crimson-700">{serverError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="h-11 px-6 rounded-xl bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 active:bg-navy-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      >
        {status === "saving" ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving...
          </>
        ) : status === "saved" ? (
          <>
            <svg className="h-4 w-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </>
        ) : (
          "Save Changes"
        )}
      </button>
    </form>
  );
}
