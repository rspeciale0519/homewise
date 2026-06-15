"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { agentApplicationSchema, type AgentApplicationInput } from "@/schemas/agent-application.schema";
import { FormSuccess } from "@/components/forms/form-success";
import { MlsRedirectNotice } from "./mls-redirect-notice";
import { cn } from "@/lib/utils";

type Step = "mls-question" | "mls-intent" | "redirect" | "form";
type FormFields = Omit<AgentApplicationInput, "hasMlsAccess" | "company">;
type FieldErrors = Partial<Record<keyof FormFields, string>>;

interface ApplicationFormProps {
  riusaUrl: string;
}

const EMPTY: FormFields = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  licenseNumber: "",
  mlsAgentId: "",
  message: "",
};

export function ApplicationForm({ riusaUrl }: ApplicationFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("mls-question");
  const [intendsToObtain, setIntendsToObtain] = useState(false);
  const [form, setForm] = useState<FormFields>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const validateField = (field: keyof FormFields, value: string) => {
    const candidate = { ...form, [field]: value, hasMlsAccess: true };
    const result = agentApplicationSchema.safeParse(candidate);
    if (result.success) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } else {
      const fieldError = result.error.flatten().fieldErrors[field];
      if (fieldError?.[0]) setErrors((prev) => ({ ...prev, [field]: fieldError[0] }));
    }
  };

  const handleChange = (field: keyof FormFields, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched.has(field)) validateField(field, value);
  };

  const handleBlur = (field: keyof FormFields) => {
    setTouched((prev) => new Set(prev).add(field));
    validateField(field, form[field] ?? "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const payload = { ...form, hasMlsAccess: true, company: honeypot };
    const result = agentApplicationSchema.safeParse(payload);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const newErrors: FieldErrors = {};
      for (const [key, msgs] of Object.entries(flat)) {
        if (msgs?.[0] && key in EMPTY) newErrors[key as keyof FormFields] = msgs[0];
      }
      setErrors(newErrors);
      setTouched(new Set(Object.keys(EMPTY)));
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/agent-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Submission failed");
      }
      setStatus("success");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <FormSuccess
        title="Application Received"
        message="Thanks for applying to become a HomeWise Agent. Our corporate office will review your application and follow up by email. You'll get a registration link once you're approved."
        onReset={() => router.push("/")}
        resetLabel="Back to Home"
      />
    );
  }

  if (step === "mls-question") {
    return (
      <Choice
        title="Do you have active MLS access?"
        subtitle="HomeWise Agents must hold active MLS access through a licensed brokerage."
        onYes={() => setStep("form")}
        onNo={() => setStep("mls-intent")}
      />
    );
  }

  if (step === "mls-intent") {
    return (
      <Choice
        title="Do you plan to obtain MLS access?"
        subtitle="We'll point you to the right place to get licensed and MLS-enabled."
        yesLabel="Yes, I want to obtain it"
        noLabel="No, not right now"
        onYes={() => {
          setIntendsToObtain(true);
          setStep("redirect");
        }}
        onNo={() => {
          setIntendsToObtain(false);
          setStep("redirect");
        }}
        onBack={() => setStep("mls-question")}
      />
    );
  }

  if (step === "redirect") {
    return (
      <MlsRedirectNotice
        riusaUrl={riusaUrl}
        intendsToObtain={intendsToObtain}
        onBack={() => setStep("mls-intent")}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <Field id="app-first" label="First Name" required value={form.firstName ?? ""} error={errors.firstName} touched={touched.has("firstName")} onChange={(v) => handleChange("firstName", v)} onBlur={() => handleBlur("firstName")} placeholder="Jane" />
        <Field id="app-last" label="Last Name" required value={form.lastName ?? ""} error={errors.lastName} touched={touched.has("lastName")} onChange={(v) => handleChange("lastName", v)} onBlur={() => handleBlur("lastName")} placeholder="Smith" />
      </div>
      <Field id="app-email" label="Email" type="email" required value={form.email ?? ""} error={errors.email} touched={touched.has("email")} onChange={(v) => handleChange("email", v)} onBlur={() => handleBlur("email")} placeholder="jane@example.com" />
      <Field id="app-phone" label="Phone" type="tel" value={form.phone ?? ""} error={errors.phone} touched={touched.has("phone")} onChange={(v) => handleChange("phone", v)} onBlur={() => handleBlur("phone")} placeholder="(407) 555-0100" />
      <Field id="app-license" label="Real Estate License #" value={form.licenseNumber ?? ""} error={errors.licenseNumber} touched={touched.has("licenseNumber")} onChange={(v) => handleChange("licenseNumber", v)} onBlur={() => handleBlur("licenseNumber")} placeholder="SL3401234" />
      <Field id="app-mlsid" label="MLS Agent ID" value={form.mlsAgentId ?? ""} error={errors.mlsAgentId} touched={touched.has("mlsAgentId")} onChange={(v) => handleChange("mlsAgentId", v)} onBlur={() => handleBlur("mlsAgentId")} placeholder="Optional" />

      <div>
        <label htmlFor="app-message" className="block text-sm font-medium text-navy-700 mb-1.5">
          Tell us about yourself <span className="text-slate-400 text-xs font-normal">(optional)</span>
        </label>
        <textarea
          id="app-message"
          rows={4}
          value={form.message ?? ""}
          onChange={(e) => handleChange("message", e.target.value)}
          onBlur={() => handleBlur("message")}
          className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-shadow resize-none"
          placeholder="Your experience, brokerage, and why you'd like to join HomeWise."
        />
        {errors.message && touched.has("message") && <p className="mt-1 text-xs text-crimson-600">{errors.message}</p>}
      </div>

      {/* Honeypot — hidden from users */}
      <div aria-hidden className="hidden">
        <label htmlFor="app-company">Company</label>
        <input id="app-company" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </div>

      {serverError && (
        <div className="rounded-xl bg-crimson-50 border border-crimson-200 px-4 py-3">
          <p className="text-sm text-crimson-700">{serverError}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setStep("mls-question")} className="h-12 px-4 rounded-xl text-sm font-medium text-slate-500 hover:text-navy-700 transition-colors">
          ← Back
        </button>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="flex-1 h-12 rounded-xl bg-crimson-600 text-white font-semibold text-sm hover:bg-crimson-700 active:bg-crimson-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2"
        >
          {status === "submitting" ? "Submitting..." : "Submit Application"}
        </button>
      </div>
    </form>
  );
}

function Choice({
  title,
  subtitle,
  yesLabel = "Yes",
  noLabel = "No",
  onYes,
  onNo,
  onBack,
}: {
  title: string;
  subtitle: string;
  yesLabel?: string;
  noLabel?: string;
  onYes: () => void;
  onNo: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="space-y-5 text-center">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl text-navy-700">{title}</h2>
        <p className="text-sm text-slate-500 leading-relaxed">{subtitle}</p>
      </div>
      <div className="grid gap-3">
        <button type="button" onClick={onYes} className="w-full h-12 rounded-xl bg-crimson-600 text-white font-semibold text-sm hover:bg-crimson-700 active:bg-crimson-800 transition-colors shadow-sm hover:shadow-md">
          {yesLabel}
        </button>
        <button type="button" onClick={onNo} className="w-full h-12 rounded-xl bg-white border border-slate-200 text-navy-700 font-semibold text-sm hover:bg-slate-50 transition-colors">
          {noLabel}
        </button>
      </div>
      {onBack && (
        <button type="button" onClick={onBack} className="text-sm font-medium text-slate-500 hover:text-navy-700 transition-colors">
          ← Back
        </button>
      )}
    </div>
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
        {required ? <span className="text-crimson-500 ml-0.5">*</span> : <span className="text-slate-400 text-xs font-normal ml-1">(optional)</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={cn(
          "w-full h-11 px-4 text-sm bg-white border rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow",
          error && touched ? "border-crimson-300 focus:ring-crimson-500" : "border-slate-200 focus:ring-navy-600"
        )}
        placeholder={placeholder}
      />
      {error && touched && <p className="mt-1 text-xs text-crimson-600">{error}</p>}
    </div>
  );
}
