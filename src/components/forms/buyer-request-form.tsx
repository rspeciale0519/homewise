"use client";

import { useState } from "react";
import { buyerRequestSchema, type BuyerRequestInput, BUYER_TIMELINES } from "@/schemas/buyer-request.schema";
import { PROPERTY_TYPES } from "@/schemas/property-filter.schema";
import { FormSuccess } from "./form-success";
import { cn } from "@/lib/utils";

type FieldErrors = Partial<Record<keyof BuyerRequestInput, string>>;

export function BuyerRequestForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    areasOfInterest: "",
    minPrice: "",
    maxPrice: "",
    beds: "",
    baths: "",
    propertyTypes: [] as string[],
    timeline: "",
    comments: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched.has(field)) {
      const result = buyerRequestSchema.safeParse({ ...form, [field]: value });
      if (result.success) {
        setErrors((prev) => { const n = { ...prev }; delete n[field as keyof BuyerRequestInput]; return n; });
      }
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => new Set(prev).add(field));
  };

  const togglePropertyType = (type: string) => {
    setForm((prev) => ({
      ...prev,
      propertyTypes: prev.propertyTypes.includes(type)
        ? prev.propertyTypes.filter((t) => t !== type)
        : [...prev.propertyTypes, type],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const payload = {
      ...form,
      minPrice: form.minPrice ? Number(form.minPrice) : undefined,
      maxPrice: form.maxPrice ? Number(form.maxPrice) : undefined,
      beds: form.beds ? Number(form.beds) : undefined,
      baths: form.baths ? Number(form.baths) : undefined,
    };

    const result = buyerRequestSchema.safeParse(payload);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const newErrors: FieldErrors = {};
      for (const [key, msgs] of Object.entries(flat)) {
        if (msgs?.[0]) newErrors[key as keyof BuyerRequestInput] = msgs[0];
      }
      setErrors(newErrors);
      setTouched(new Set(Object.keys(form)));
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/buyer-request", {
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
        title="Request Received!"
        message="Thank you! One of our buyer specialists will review your preferences and reach out within one business day."
        onReset={() => {
          setForm({ name: "", email: "", phone: "", areasOfInterest: "", minPrice: "", maxPrice: "", beds: "", baths: "", propertyTypes: [], timeline: "", comments: "" });
          setErrors({});
          setTouched(new Set());
          setStatus("idle");
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Contact Info */}
      <div>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-navy-500 mb-4">Your Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Full Name" required value={form.name} error={errors.name} touched={touched.has("name")} onChange={(v) => handleChange("name", v)} onBlur={() => handleBlur("name")} placeholder="John Doe" />
          <FormField label="Email" required type="email" value={form.email} error={errors.email} touched={touched.has("email")} onChange={(v) => handleChange("email", v)} onBlur={() => handleBlur("email")} placeholder="john@example.com" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <FormField label="Phone" value={form.phone} error={errors.phone} touched={touched.has("phone")} onChange={(v) => handleChange("phone", v)} onBlur={() => handleBlur("phone")} placeholder="(407) 555-0100" hint="Optional" />
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Timeline</label>
            <select value={form.timeline} onChange={(e) => handleChange("timeline", e.target.value)} className="w-full h-11 pl-4 pr-10 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-shadow cursor-pointer">
              <option value="">When are you looking?</option>
              {BUYER_TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Property Preferences */}
      <div>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-navy-500 mb-4">What Are You Looking For?</p>
        <FormField label="Areas of Interest" value={form.areasOfInterest} onChange={(v) => handleChange("areasOfInterest", v)} onBlur={() => handleBlur("areasOfInterest")} placeholder="e.g., Winter Park, Lake Mary, downtown Orlando..." hint="Cities, neighborhoods, or zip codes" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <FormField label="Min Price" type="number" value={form.minPrice} onChange={(v) => handleChange("minPrice", v)} placeholder="$200,000" />
          <FormField label="Max Price" type="number" value={form.maxPrice} onChange={(v) => handleChange("maxPrice", v)} placeholder="$600,000" />
          <FormField label="Beds" type="number" value={form.beds} onChange={(v) => handleChange("beds", v)} placeholder="3+" />
          <FormField label="Baths" type="number" value={form.baths} onChange={(v) => handleChange("baths", v)} placeholder="2+" />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-navy-700 mb-2.5">Property Types</label>
          <div className="flex flex-wrap gap-2">
            {PROPERTY_TYPES.map((type) => (
              <button key={type} type="button" onClick={() => togglePropertyType(type)} className={cn("px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200", form.propertyTypes.includes(type) ? "bg-navy-600 border-navy-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-navy-300 hover:text-navy-700")}>
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comments */}
      <div>
        <label htmlFor="buyer-comments" className="block text-sm font-medium text-navy-700 mb-1.5">
          Additional Details <span className="text-slate-400 text-xs font-normal">(optional)</span>
        </label>
        <textarea id="buyer-comments" rows={4} value={form.comments} onChange={(e) => handleChange("comments", e.target.value)} className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-shadow resize-none" placeholder="Tell us anything else that's important — must-haves, deal-breakers, special requirements..." />
      </div>

      {serverError && (
        <div className="rounded-xl bg-crimson-50 border border-crimson-200 px-4 py-3">
          <p className="text-sm text-crimson-700">{serverError}</p>
        </div>
      )}

      <button type="submit" disabled={status === "submitting"} className="w-full h-12 rounded-xl bg-crimson-600 text-white font-semibold text-sm hover:bg-crimson-700 active:bg-crimson-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2">
        {status === "submitting" ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Submitting...
          </>
        ) : "Submit Property Request"}
      </button>
    </form>
  );
}

function FormField({ label, required, type = "text", value, error, touched, onChange, onBlur, placeholder, hint }: {
  label: string; required?: boolean; type?: string; value: string; error?: string; touched?: boolean;
  onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; hint?: string;
}) {
  const id = `buyer-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-navy-700 mb-1.5">
        {label} {required && <span className="text-crimson-500">*</span>}
        {hint && <span className="text-slate-400 text-xs font-normal ml-1">({hint})</span>}
      </label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className={cn("w-full h-11 px-4 text-sm bg-white border rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow", error && touched ? "border-crimson-300 focus:ring-crimson-500" : "border-slate-200 focus:ring-navy-600")} placeholder={placeholder} />
      {error && touched && <p className="mt-1 text-xs text-crimson-600">{error}</p>}
    </div>
  );
}
