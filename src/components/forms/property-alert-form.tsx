"use client";

import { useState } from "react";
import { propertyAlertSchema, type PropertyAlertInput, ALERT_CITIES } from "@/schemas/property-alert.schema";
import { FormSuccess } from "./form-success";
import { cn } from "@/lib/utils";

type FieldErrors = Partial<Record<keyof PropertyAlertInput, string>>;

export function PropertyAlertForm() {
  const [form, setForm] = useState({
    email: "",
    name: "",
    cities: [] as string[],
    minPrice: "",
    maxPrice: "",
    beds: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => new Set(prev).add(field));
  };

  const toggleCity = (city: string) => {
    setForm((prev) => ({
      ...prev,
      cities: prev.cities.includes(city)
        ? prev.cities.filter((c) => c !== city)
        : [...prev.cities, city],
    }));
    if (!touched.has("cities")) {
      setTouched((prev) => new Set(prev).add("cities"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const payload = {
      ...form,
      minPrice: form.minPrice ? Number(form.minPrice) : undefined,
      maxPrice: form.maxPrice ? Number(form.maxPrice) : undefined,
      beds: form.beds ? Number(form.beds) : undefined,
    };

    const result = propertyAlertSchema.safeParse(payload);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const newErrors: FieldErrors = {};
      for (const [key, msgs] of Object.entries(flat)) {
        if (msgs?.[0]) newErrors[key as keyof PropertyAlertInput] = msgs[0];
      }
      setErrors(newErrors);
      setTouched(new Set(Object.keys(form)));
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/property-alerts", {
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
        title="You're Subscribed!"
        message="We'll send you email alerts when new listings match your criteria. You can update your preferences anytime."
        onReset={() => {
          setForm({ email: "", name: "", cities: [], minPrice: "", maxPrice: "", beds: "" });
          setErrors({});
          setTouched(new Set());
          setStatus("idle");
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="alert-name" className="block text-sm font-medium text-navy-700 mb-1.5">
            Name <span className="text-slate-400 text-xs font-normal">(optional)</span>
          </label>
          <input id="alert-name" type="text" value={form.name} onChange={(e) => handleChange("name", e.target.value)} className="w-full h-11 px-4 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-shadow" placeholder="John Doe" />
        </div>
        <div>
          <label htmlFor="alert-email" className="block text-sm font-medium text-navy-700 mb-1.5">
            Email <span className="text-crimson-500">*</span>
          </label>
          <input id="alert-email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} onBlur={() => handleBlur("email")} className={cn("w-full h-11 px-4 text-sm bg-white border rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow", errors.email && touched.has("email") ? "border-crimson-300 focus:ring-crimson-500" : "border-slate-200 focus:ring-navy-600")} placeholder="john@example.com" />
          {errors.email && touched.has("email") && <p className="mt-1 text-xs text-crimson-600">{errors.email}</p>}
        </div>
      </div>

      {/* Areas */}
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-2.5">
          Areas of Interest <span className="text-crimson-500">*</span>
        </label>
        <p className="text-xs text-slate-500 mb-3">Select the cities you want to receive alerts for.</p>
        <div className="flex flex-wrap gap-2">
          {ALERT_CITIES.map((city) => (
            <button key={city} type="button" onClick={() => toggleCity(city)} className={cn("px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-200", form.cities.includes(city) ? "bg-navy-600 border-navy-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-navy-300 hover:text-navy-700")}>
              {city}
            </button>
          ))}
        </div>
        {errors.cities && touched.has("cities") && <p className="mt-2 text-xs text-crimson-600">{errors.cities}</p>}
      </div>

      {/* Price / Beds */}
      <div>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-navy-500 mb-4">Optional Filters</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="alert-min" className="block text-sm font-medium text-navy-700 mb-1.5">Min Price</label>
            <input id="alert-min" type="number" value={form.minPrice} onChange={(e) => handleChange("minPrice", e.target.value)} className="w-full h-11 px-4 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-shadow" placeholder="$200k" />
          </div>
          <div>
            <label htmlFor="alert-max" className="block text-sm font-medium text-navy-700 mb-1.5">Max Price</label>
            <input id="alert-max" type="number" value={form.maxPrice} onChange={(e) => handleChange("maxPrice", e.target.value)} className="w-full h-11 px-4 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-shadow" placeholder="$600k" />
          </div>
          <div>
            <label htmlFor="alert-beds" className="block text-sm font-medium text-navy-700 mb-1.5">Min Beds</label>
            <input id="alert-beds" type="number" value={form.beds} onChange={(e) => handleChange("beds", e.target.value)} className="w-full h-11 px-4 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-shadow" placeholder="3" />
          </div>
        </div>
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
            Subscribing...
          </>
        ) : "Get Property Alerts"}
      </button>
    </form>
  );
}
