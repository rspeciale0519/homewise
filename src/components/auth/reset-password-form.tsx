"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/supabase-provider";

type Status = "idle" | "submitting" | "success" | "error";

export function ResetPasswordForm() {
  const router = useRouter();
  const { supabase } = useSupabase();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const passwordTooShort = password.length > 0 && password.length < 8;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = password.length >= 8 && password === confirmPassword && status !== "submitting";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    setStatus("submitting");
    setErrorMessage("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("success");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
      <h2 className="font-serif text-2xl font-semibold text-navy-700 mb-2">Set Your Password</h2>
      <p className="text-sm text-slate-500 mb-6">
        Choose a new password for your account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-navy-700 mb-1.5">
            New Password
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 px-4 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-shadow"
            placeholder="Minimum 8 characters"
            minLength={8}
            required
          />
          {passwordTooShort && (
            <p className="mt-1 text-xs text-crimson-600">Password must be at least 8 characters.</p>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-navy-700 mb-1.5">
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-11 px-4 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-shadow"
            placeholder="Re-enter your password"
            required
          />
          {passwordsMismatch && (
            <p className="mt-1 text-xs text-crimson-600">Passwords do not match.</p>
          )}
        </div>

        {status === "error" && (
          <div className="rounded-xl bg-crimson-50 border border-crimson-200 px-4 py-3">
            <p className="text-sm text-crimson-700">{errorMessage}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-12 rounded-xl bg-crimson-600 text-white font-semibold text-sm hover:bg-crimson-700 active:bg-crimson-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2"
        >
          {status === "submitting" ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Setting Password...
            </>
          ) : (
            "Set Password"
          )}
        </button>
      </form>
    </div>
  );
}
