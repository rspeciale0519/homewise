"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginSchema, magicLinkSchema } from "@/schemas/login.schema";
import { useSupabase } from "@/components/providers/supabase-provider";
import { cn } from "@/lib/utils";

type Mode = "password" | "magic-link";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirectTo = searchParams.get("redirectTo");
  const redirectTo = rawRedirectTo ?? "/dashboard";
  const redirectToIsDefault = !rawRedirectTo || rawRedirectTo === "/dashboard";
  const { supabase } = useSupabase();

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    let destination = redirectTo;
    if (redirectToIsDefault) {
      try {
        const res = await fetch("/api/me/dashboard-view", {
          cache: "no-store",
        });
        if (res.ok) {
          const json = (await res.json()) as { path?: string };
          if (typeof json.path === "string" && json.path.startsWith("/")) {
            destination = json.path;
          }
        }
      } catch {
        // Fall back to /dashboard on network error.
      }
    }

    router.push(destination);
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
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="block text-sm font-medium text-navy-700">
              Password <span className="text-crimson-500">*</span>
            </label>
            <Link href="/forgot-password" className="text-xs text-navy-600 hover:underline">
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((p) => new Set(p).add("password"))}
              className={cn(
                "w-full h-11 px-4 pr-11 text-sm bg-white border rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow",
                errors.password && touched.has("password")
                  ? "border-crimson-300 focus:ring-crimson-500"
                  : "border-slate-200 focus:ring-navy-600"
              )}
              placeholder="Your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
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
