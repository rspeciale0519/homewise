"use client";

import { useState } from "react";
import { contactSchema, type ContactInput } from "@/schemas/contact.schema";
import { FormSuccess } from "./form-success";
import { cn } from "@/lib/utils";

type FieldErrors = Partial<Record<keyof ContactInput, string>>;

export function ContactForm() {
  const [form, setForm] = useState<ContactInput>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");

  const validateField = (field: keyof ContactInput, value: string) => {
    const partial = { ...form, [field]: value };
    const result = contactSchema.safeParse(partial);
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

  const handleChange = (field: keyof ContactInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched.has(field)) {
      validateField(field, value);
    }
  };

  const handleBlur = (field: keyof ContactInput) => {
    setTouched((prev) => new Set(prev).add(field));
    validateField(field, form[field] ?? "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const newErrors: FieldErrors = {};
      for (const [key, msgs] of Object.entries(flat)) {
        if (msgs?.[0]) newErrors[key as keyof ContactInput] = msgs[0];
      }
      setErrors(newErrors);
      setTouched(new Set(Object.keys(form)));
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
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
        title="Message Sent!"
        message="Thank you for reaching out. One of our team members will respond within one business day."
        onReset={() => {
          setForm({ name: "", email: "", phone: "", message: "" });
          setErrors({});
          setTouched(new Set());
          setStatus("idle");
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Name */}
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium text-navy-700 mb-1.5">
          Full Name <span className="text-crimson-500">*</span>
        </label>
        <input
          id="contact-name"
          type="text"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          onBlur={() => handleBlur("name")}
          className={cn(
            "w-full h-11 px-4 text-sm bg-white border rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow",
            errors.name && touched.has("name")
              ? "border-crimson-300 focus:ring-crimson-500"
              : "border-slate-200 focus:ring-navy-600"
          )}
          placeholder="John Doe"
        />
        {errors.name && touched.has("name") && (
          <p className="mt-1 text-xs text-crimson-600">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="contact-email" className="block text-sm font-medium text-navy-700 mb-1.5">
          Email <span className="text-crimson-500">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          onBlur={() => handleBlur("email")}
          className={cn(
            "w-full h-11 px-4 text-sm bg-white border rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow",
            errors.email && touched.has("email")
              ? "border-crimson-300 focus:ring-crimson-500"
              : "border-slate-200 focus:ring-navy-600"
          )}
          placeholder="john@example.com"
        />
        {errors.email && touched.has("email") && (
          <p className="mt-1 text-xs text-crimson-600">{errors.email}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="contact-phone" className="block text-sm font-medium text-navy-700 mb-1.5">
          Phone <span className="text-slate-400 text-xs font-normal">(optional)</span>
        </label>
        <input
          id="contact-phone"
          type="tel"
          value={form.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          onBlur={() => handleBlur("phone")}
          className={cn(
            "w-full h-11 px-4 text-sm bg-white border rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow",
            errors.phone && touched.has("phone")
              ? "border-crimson-300 focus:ring-crimson-500"
              : "border-slate-200 focus:ring-navy-600"
          )}
          placeholder="(407) 555-0100"
        />
        {errors.phone && touched.has("phone") && (
          <p className="mt-1 text-xs text-crimson-600">{errors.phone}</p>
        )}
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-navy-700 mb-1.5">
          Message <span className="text-crimson-500">*</span>
        </label>
        <textarea
          id="contact-message"
          rows={5}
          value={form.message}
          onChange={(e) => handleChange("message", e.target.value)}
          onBlur={() => handleBlur("message")}
          className={cn(
            "w-full px-4 py-3 text-sm bg-white border rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow resize-none",
            errors.message && touched.has("message")
              ? "border-crimson-300 focus:ring-crimson-500"
              : "border-slate-200 focus:ring-navy-600"
          )}
          placeholder="How can we help you?"
        />
        {errors.message && touched.has("message") && (
          <p className="mt-1 text-xs text-crimson-600">{errors.message}</p>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="rounded-xl bg-crimson-50 border border-crimson-200 px-4 py-3">
          <p className="text-sm text-crimson-700">{serverError}</p>
        </div>
      )}

      {/* Submit */}
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
            Sending...
          </>
        ) : (
          "Send Message"
        )}
      </button>
    </form>
  );
}
