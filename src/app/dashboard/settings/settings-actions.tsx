"use client";

import { useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";

interface SettingsActionsProps {
  hasPasswordProvider: boolean;
  email: string;
}

export function SettingsActions({ hasPasswordProvider, email }: SettingsActionsProps) {
  const { supabase } = useSupabase();
  const [resetStatus, setResetStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handlePasswordReset = async () => {
    setResetStatus("sending");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?redirectTo=/dashboard/settings`,
    });

    if (error) {
      setResetStatus("error");
      return;
    }

    setResetStatus("sent");
  };

  return (
    <div className="space-y-4">
      {hasPasswordProvider ? (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-navy-700">Change Password</p>
            <p className="text-xs text-slate-400 mt-0.5">
              We&apos;ll send a password reset link to your email.
            </p>
          </div>
          <button
            onClick={handlePasswordReset}
            disabled={resetStatus === "sending" || resetStatus === "sent"}
            className="shrink-0 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-navy-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {resetStatus === "sending"
              ? "Sending..."
              : resetStatus === "sent"
              ? "Email Sent"
              : "Send Reset Link"}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium text-navy-700">Password</p>
          <p className="text-xs text-slate-400 mt-0.5">
            You signed up with Google. No password to manage.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
        <div>
          <p className="text-sm font-medium text-navy-700">Email</p>
          <p className="text-xs text-slate-400 mt-0.5">{email}</p>
        </div>
      </div>
    </div>
  );
}
