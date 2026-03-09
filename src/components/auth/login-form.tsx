"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginSchema, magicLinkSchema } from "@/schemas/login.schema";
import { useSupabase } from "@/components/providers/supabase-provider";
import { cn } from "@/lib/utils";

type Mode = "password" | "magic-link";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const { supabase } = useSupabase();

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "submitting" | "magic-sent" | "error">("idle");
  const [serverError, setServerError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    if (mode === "magic-link") {
      const result = magicLinkSchema.safeParse({ email });
      if (!result.success) {
        setErrors({ email: result.error.flatten().fieldErrors.email?.[0] ?? "Invalid email" });
        setTouched(new Set(["email"]));
        return;
      }

      setStatus("submitting");
      const { error } = await supabase.auth.signInWithOtp({
        email: result.data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        setServerError(error.message);
        setStatus("error");
        return;
      }

      setStatus("magic-sent");
      return;
    }

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const newErrors: Record<string, string> = {};
      for (const [key, msgs] of Object.entries(flat)) {
        if (msgs?.[0]) newErrors[key] = msgs[0];
      }
      setErrors(newErrors);
      setTouched(new Set(["email", "password"]));
      return;
    }

    setStatus("submitting");
    const { error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      setServerError(error.message);
      setStatus("error");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  if (status === "magic-sent") {
    return (
      <div className="text-center py-6 animate-fade-in">
        <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-navy-50 flex items-center justify-center">
          <svg className="h-8 w-8 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h3 className="font-serif text-xl font-semibold text-navy-700 mb-2">Check Your Inbox</h3>
        <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto mb-5">
          We sent a magic link to <strong className="text-navy-700">{email}</strong>. Click it to sign in instantly.
        </p>
        <button
          onClick={() => { setStatus("idle"); setEmail(""); }}
          className="text-sm font-medium text-crimson-600 hover:text-crimson-700 transition-colors"
        >
          Try a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Mode toggle */}
      <div className="flex rounded-lg bg-slate-100 p-0.5">
        <ModeTab
          active={mode === "password"}
          onClick={() => { setMode("password"); setErrors({}); }}
          label="Email & Password"
        />
        <ModeTab
          active={mode === "magic-link"}
          onClick={() => { setMode("magic-link"); setErrors({}); }}
          label="Magic Link"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-navy-700 mb-1.5">
          Email <span className="text-crimson-500">*</span>
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (touched.has("email")) {
              const r = magicLinkSchema.safeParse({ email: e.target.value });
              if (r.success) {
                setErrors((p) => { const n = { ...p }; delete n.email; return n; });
              }
            }
          }}
          onBlur={() => setTouched((p) => new Set(p).add("email"))}
          className={cn(
            "w-full h-11 px-4 text-sm bg-white border rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow",
            errors.email && touched.has("email")
              ? "border-crimson-300 focus:ring-crimson-500"
              : "border-slate-200 focus:ring-navy-600"
          )}
          placeholder="jane@example.com"
        />
        {errors.email && touched.has("email") && (
          <p className="mt-1 text-xs text-crimson-600">{errors.email}</p>
        )}
      </div>

      {/* Password (only in password mode) */}
      {mode === "password" && (
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-navy-700 mb-1.5">
            Password <span className="text-crimson-500">*</span>
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((p) => new Set(p).add("password"))}
            className={cn(
              "w-full h-11 px-4 text-sm bg-white border rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow",
              errors.password && touched.has("password")
                ? "border-crimson-300 focus:ring-crimson-500"
                : "border-slate-200 focus:ring-navy-600"
            )}
            placeholder="Your password"
          />
          {errors.password && touched.has("password") && (
            <p className="mt-1 text-xs text-crimson-600">{errors.password}</p>
          )}
        </div>
      )}

      {serverError && (
        <div className="rounded-xl bg-crimson-50 border border-crimson-200 px-4 py-3">
          <p className="text-sm text-crimson-700">{serverError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full h-12 rounded-xl bg-crimson-600 text-white font-semibold text-sm hover:bg-crimson-700 active:bg-crimson-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2"
      >
        {status === "submitting" ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {mode === "magic-link" ? "Sending Link..." : "Signing In..."}
          </>
        ) : mode === "magic-link" ? (
          "Send Magic Link"
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 py-2 text-xs font-medium rounded-md transition-all duration-200",
        active
          ? "bg-white text-navy-700 shadow-sm"
          : "text-slate-500 hover:text-slate-700"
      )}
    >
      {label}
    </button>
  );
}
