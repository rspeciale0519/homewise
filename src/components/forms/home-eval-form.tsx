"use client";

import { useState } from "react";
import {
  homeEvaluationSchema,
  type HomeEvaluationInput,
  PROPERTY_TYPES,
  SELL_TIMELINES,
  LISTING_STATUSES,
} from "@/schemas/home-evaluation.schema";
import { FormSuccess } from "./form-success";
import { cn } from "@/lib/utils";

type FieldErrors = Partial<Record<keyof HomeEvaluationInput, string>>;

const STEPS = [
  { label: "Contact", icon: "person" },
  { label: "Property", icon: "home" },
  { label: "Details", icon: "details" },
] as const;

const INITIAL: HomeEvaluationInput = {
  name: "",
  email: "",
  phone: "",
  streetAddress: "",
  city: "",
  state: "FL",
  zip: "",
  bedrooms: undefined,
  bathrooms: undefined,
  sqft: undefined,
  garageSpaces: undefined,
  propertyType: undefined,
  sellTimeline: undefined,
  listingStatus: undefined,
  comments: "",
};

export function HomeEvalForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<HomeEvaluationInput>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");

  const handleChange = (field: keyof HomeEvaluationInput, value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched.has(field)) {
      validateField(field, value);
    }
  };

  const validateField = (field: keyof HomeEvaluationInput, value: string | number | undefined) => {
    const partial = { ...form, [field]: value };
    const result = homeEvaluationSchema.safeParse(partial);
    if (result.success) {
      setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    } else {
      const fieldError = result.error.flatten().fieldErrors[field];
      if (fieldError?.[0]) {
        setErrors((prev) => ({ ...prev, [field]: fieldError[0] }));
      }
    }
  };

  const handleBlur = (field: keyof HomeEvaluationInput) => {
    setTouched((prev) => new Set(prev).add(field));
    validateField(field, form[field]);
  };

  const stepFields: (keyof HomeEvaluationInput)[][] = [
    ["name", "email", "phone"],
    ["streetAddress", "city", "state", "zip"],
    ["bedrooms", "bathrooms", "sqft", "propertyType", "sellTimeline", "listingStatus", "comments"],
  ];

  const validateStep = (): boolean => {
    const fields = stepFields[step];
    if (!fields) return true;
    const result = homeEvaluationSchema.safeParse(form);
    const newErrors: FieldErrors = {};
    const newTouched = new Set(touched);
    let valid = true;

    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      for (const field of fields) {
        const msgs = flat[field];
        if (msgs?.[0]) {
          newErrors[field] = msgs[0];
          newTouched.add(field);
          valid = false;
        }
      }
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    setTouched(newTouched);
    return valid;
  };

  const handleNext = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, 2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const result = homeEvaluationSchema.safeParse(form);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const newErrors: FieldErrors = {};
      for (const [key, msgs] of Object.entries(flat)) {
        if (msgs?.[0]) newErrors[key as keyof HomeEvaluationInput] = msgs[0];
      }
      setErrors(newErrors);
      setTouched(new Set(Object.keys(form)));
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/home-evaluation", {
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
        message="Your home evaluation request has been submitted. A local agent will prepare your Comparative Market Analysis and contact you within 48 hours."
        onReset={() => {
          setForm(INITIAL);
          setErrors({});
          setTouched(new Set());
          setStep(0);
          setStatus("idle");
        }}
        resetLabel="Submit Another Request"
      />
    );
  }

  const inputClass = (field: keyof HomeEvaluationInput) =>
    cn(
      "w-full h-11 px-4 text-sm bg-white border rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow",
      errors[field] && touched.has(field)
        ? "border-crimson-300 focus:ring-crimson-500"
        : "border-slate-200 focus:ring-navy-600"
    );

  const selectClass = (field: keyof HomeEvaluationInput) =>
    cn(
      "w-full h-11 px-4 text-sm bg-white border rounded-xl text-navy-700 appearance-none focus:outline-none focus:ring-2 focus:border-transparent transition-shadow cursor-pointer",
      errors[field] && touched.has(field)
        ? "border-crimson-300 focus:ring-crimson-500"
        : "border-slate-200 focus:ring-navy-600"
    );

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => { if (i < step) setStep(i); }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
              i === step
                ? "bg-crimson-600 text-white shadow-sm"
                : i < step
                  ? "bg-navy-100 text-navy-700 cursor-pointer hover:bg-navy-200"
                  : "bg-slate-100 text-slate-400 cursor-default"
            )}
          >
            <span className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
              {i < step ? (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
        <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-crimson-600 rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 0: Contact */}
      {step === 0 && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label htmlFor="eval-name" className="block text-sm font-medium text-navy-700 mb-1.5">
              Full Name <span className="text-crimson-500">*</span>
            </label>
            <input id="eval-name" type="text" value={form.name} onChange={(e) => handleChange("name", e.target.value)} onBlur={() => handleBlur("name")} className={inputClass("name")} placeholder="Jane Smith" />
            {errors.name && touched.has("name") && <p className="mt-1 text-xs text-crimson-600">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="eval-email" className="block text-sm font-medium text-navy-700 mb-1.5">
              Email <span className="text-crimson-500">*</span>
            </label>
            <input id="eval-email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} onBlur={() => handleBlur("email")} className={inputClass("email")} placeholder="jane@example.com" />
            {errors.email && touched.has("email") && <p className="mt-1 text-xs text-crimson-600">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="eval-phone" className="block text-sm font-medium text-navy-700 mb-1.5">
              Phone <span className="text-crimson-500">*</span>
            </label>
            <input id="eval-phone" type="tel" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} onBlur={() => handleBlur("phone")} className={inputClass("phone")} placeholder="(407) 555-0100" />
            {errors.phone && touched.has("phone") && <p className="mt-1 text-xs text-crimson-600">{errors.phone}</p>}
          </div>
        </div>
      )}

      {/* Step 1: Property address */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label htmlFor="eval-address" className="block text-sm font-medium text-navy-700 mb-1.5">
              Street Address <span className="text-crimson-500">*</span>
            </label>
            <input id="eval-address" type="text" value={form.streetAddress} onChange={(e) => handleChange("streetAddress", e.target.value)} onBlur={() => handleBlur("streetAddress")} className={inputClass("streetAddress")} placeholder="412 Interlachen Ave" />
            {errors.streetAddress && touched.has("streetAddress") && <p className="mt-1 text-xs text-crimson-600">{errors.streetAddress}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="eval-city" className="block text-sm font-medium text-navy-700 mb-1.5">
                City <span className="text-crimson-500">*</span>
              </label>
              <input id="eval-city" type="text" value={form.city} onChange={(e) => handleChange("city", e.target.value)} onBlur={() => handleBlur("city")} className={inputClass("city")} placeholder="Winter Park" />
              {errors.city && touched.has("city") && <p className="mt-1 text-xs text-crimson-600">{errors.city}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="eval-state" className="block text-sm font-medium text-navy-700 mb-1.5">State</label>
                <input id="eval-state" type="text" value={form.state} onChange={(e) => handleChange("state", e.target.value)} className={inputClass("state")} maxLength={2} />
              </div>
              <div>
                <label htmlFor="eval-zip" className="block text-sm font-medium text-navy-700 mb-1.5">
                  ZIP <span className="text-crimson-500">*</span>
                </label>
                <input id="eval-zip" type="text" value={form.zip} onChange={(e) => handleChange("zip", e.target.value)} onBlur={() => handleBlur("zip")} className={inputClass("zip")} placeholder="32789" />
                {errors.zip && touched.has("zip") && <p className="mt-1 text-xs text-crimson-600">{errors.zip}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Property details */}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="eval-beds" className="block text-sm font-medium text-navy-700 mb-1.5">Beds</label>
              <input id="eval-beds" type="number" min="0" max="20" value={form.bedrooms ?? ""} onChange={(e) => handleChange("bedrooms", e.target.value ? Number(e.target.value) : undefined)} className={inputClass("bedrooms")} placeholder="3" />
            </div>
            <div>
              <label htmlFor="eval-baths" className="block text-sm font-medium text-navy-700 mb-1.5">Baths</label>
              <input id="eval-baths" type="number" min="0" max="20" step="0.5" value={form.bathrooms ?? ""} onChange={(e) => handleChange("bathrooms", e.target.value ? Number(e.target.value) : undefined)} className={inputClass("bathrooms")} placeholder="2" />
            </div>
            <div>
              <label htmlFor="eval-sqft" className="block text-sm font-medium text-navy-700 mb-1.5">Sq Ft</label>
              <input id="eval-sqft" type="number" min="100" value={form.sqft ?? ""} onChange={(e) => handleChange("sqft", e.target.value ? Number(e.target.value) : undefined)} className={inputClass("sqft")} placeholder="2,400" />
            </div>
            <div>
              <label htmlFor="eval-garage" className="block text-sm font-medium text-navy-700 mb-1.5">Garage</label>
              <input id="eval-garage" type="number" min="0" max="10" value={form.garageSpaces ?? ""} onChange={(e) => handleChange("garageSpaces", e.target.value ? Number(e.target.value) : undefined)} className={inputClass("garageSpaces")} placeholder="2" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <label htmlFor="eval-type" className="block text-sm font-medium text-navy-700 mb-1.5">Property Type</label>
              <select id="eval-type" value={form.propertyType ?? ""} onChange={(e) => handleChange("propertyType", e.target.value || undefined)} className={selectClass("propertyType")}>
                <option value="">Select type</option>
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <svg className="absolute right-3.5 top-[38px] h-4 w-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <div className="relative">
              <label htmlFor="eval-timeline" className="block text-sm font-medium text-navy-700 mb-1.5">Sell Timeline</label>
              <select id="eval-timeline" value={form.sellTimeline ?? ""} onChange={(e) => handleChange("sellTimeline", e.target.value || undefined)} className={selectClass("sellTimeline")}>
                <option value="">Select timeline</option>
                {SELL_TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <svg className="absolute right-3.5 top-[38px] h-4 w-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          <div className="relative">
            <label htmlFor="eval-listing" className="block text-sm font-medium text-navy-700 mb-1.5">Current Listing Status</label>
            <select id="eval-listing" value={form.listingStatus ?? ""} onChange={(e) => handleChange("listingStatus", e.target.value || undefined)} className={selectClass("listingStatus")}>
              <option value="">Select status</option>
              {LISTING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <svg className="absolute right-3.5 top-[38px] h-4 w-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>

          <div>
            <label htmlFor="eval-comments" className="block text-sm font-medium text-navy-700 mb-1.5">
              Additional Comments <span className="text-slate-400 text-xs font-normal">(optional)</span>
            </label>
            <textarea id="eval-comments" rows={4} value={form.comments ?? ""} onChange={(e) => handleChange("comments", e.target.value)} className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-shadow resize-none" placeholder="Anything else you'd like us to know..." />
          </div>
        </div>
      )}

      {/* Server error */}
      {serverError && (
        <div className="mt-4 rounded-xl bg-crimson-50 border border-crimson-200 px-4 py-3">
          <p className="text-sm text-crimson-700">{serverError}</p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-8 gap-3">
        {step > 0 ? (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="h-11 px-6 rounded-xl border border-slate-200 text-sm font-medium text-navy-700 hover:bg-slate-50 transition-colors">
            Back
          </button>
        ) : (
          <div />
        )}

        {step < 2 ? (
          <button type="button" onClick={handleNext} className="h-11 px-8 rounded-xl bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 transition-colors shadow-sm">
            Continue
          </button>
        ) : (
          <button type="submit" disabled={status === "submitting"} className="h-11 px-8 rounded-xl bg-crimson-600 text-white text-sm font-semibold hover:bg-crimson-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2">
            {status === "submitting" ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Submitting...
              </>
            ) : "Request Evaluation"}
          </button>
        )}
      </div>
    </form>
  );
}
