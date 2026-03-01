"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerSchema, type RegisterInput } from "@/schemas/register.schema";
import { useSupabase } from "@/components/providers/supabase-provider";
import { FormSuccess } from "@/components/forms/form-success";
import { cn } from "@/lib/utils";

type FieldErrors = Partial<Record<keyof RegisterInput, string>>;

interface RegisterFormProps {
  inviteCode?: string;
}

export function RegisterForm({ inviteCode }: RegisterFormProps) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [form, setForm] = useState<RegisterInput>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");

  const validateField = (field: keyof RegisterInput, value: string) => {
    const partial = { ...form, [field]: value };
    const result = registerSchema.safeParse(partial);
    if (result.success) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } else {
      const fieldError = result.error.flatten().fieldErrors[field];
      if (fieldError?.[0]) {
        setErrors((prev) => ({ ...prev, [field]: fieldError[0] }));
      }
    }
  };

  const handleChange = (field: keyof RegisterInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched.has(field)) validateField(field, value);
  };

  const handleBlur = (field: keyof RegisterInput) => {
    setTouched((prev) => new Set(prev).add(field));
    validateField(field, form[field]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const newErrors: FieldErrors = {};
      for (const [key, msgs] of Object.entries(flat)) {
        if (msgs?.[0]) newErrors[key as keyof RegisterInput] = msgs[0];
      }
      setErrors(newErrors);
      setTouched(new Set(Object.keys(form)));
      return;
    }

    setStatus("submitting");

    const { error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        data: {
          first_name: result.data.firstName,
          last_name: result.data.lastName,
          invite_code: inviteCode ?? "",
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setServerError(error.message);
      setStatus("error");
      return;
    }

    setStatus("success");
  };

  if (status === "success") {
    return (
      <FormSuccess
        title="Check Your Email"
        message="We've sent a confirmation link to your inbox. Click it to activate your account and start exploring."
        onReset={() => router.push("/login")}
        resetLabel="Go to Log In"
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <Field
          id="register-first"
          label="First Name"
          required
          value={form.firstName}
          error={errors.firstName}
          touched={touched.has("firstName")}
          onChange={(v) => handleChange("firstName", v)}
          onBlur={() => handleBlur("firstName")}
          placeholder="Jane"
        />
        <Field
          id="register-last"
          label="Last Name"
          required
          value={form.lastName}
          error={errors.lastName}
          touched={touched.has("lastName")}
          onChange={(v) => handleChange("lastName", v)}
          onBlur={() => handleBlur("lastName")}
          placeholder="Smith"
        />
      </div>

      <Field
        id="register-email"
        label="Email"
        type="email"
        required
        value={form.email}
        error={errors.email}
        touched={touched.has("email")}
        onChange={(v) => handleChange("email", v)}
        onBlur={() => handleBlur("email")}
        placeholder="jane@example.com"
      />

      <Field
        id="register-password"
        label="Password"
        type="password"
        required
        value={form.password}
        error={errors.password}
        touched={touched.has("password")}
        onChange={(v) => handleChange("password", v)}
        onBlur={() => handleBlur("password")}
        placeholder="At least 8 characters"
      />

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
            Creating Account...
          </>
        ) : (
          "Create Account"
        )}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  required,
  value,
  error,
  touched,
  onChange,
  onBlur,
  placeholder,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  error?: string;
  touched: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-navy-700 mb-1.5">
        {label}
        {required && <span className="text-crimson-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={cn(
          "w-full h-11 px-4 text-sm bg-white border rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow",
          error && touched
            ? "border-crimson-300 focus:ring-crimson-500"
            : "border-slate-200 focus:ring-navy-600"
        )}
        placeholder={placeholder}
      />
      {error && touched && (
        <p className="mt-1 text-xs text-crimson-600">{error}</p>
      )}
    </div>
  );
}
