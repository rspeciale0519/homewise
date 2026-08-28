"use client";

import { useId, useState } from "react";

interface ShowingRequestFormProps {
  propertyId: string;
  propertyAddress: string;
}

export function ShowingRequestForm({ propertyId, propertyAddress }: ShowingRequestFormProps) {
  const formId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch("/api/showing-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          propertyId,
          propertyAddress,
          preferredDate: formData.get("preferredDate"),
          preferredTime: formData.get("preferredTime"),
          message: formData.get("message"),
        }),
      });

      if (!response.ok) {
        throw new Error("Showing request failed");
      }

      setSubmitted(true);
    } catch {
      setSubmitError("We could not send your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="bg-green-50 border border-green-200 rounded-xl p-6 text-center"
        role="status"
        aria-live="polite"
      >
        <svg className="h-10 w-10 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="font-serif text-lg font-semibold text-navy-700 mb-1">Request Sent!</h3>
        <p className="text-sm text-slate-500">An agent will contact you shortly to schedule your showing.</p>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full px-4 py-3 bg-navy-600 text-white font-semibold rounded-xl hover:bg-navy-700 transition-colors text-sm"
      >
        Schedule a Showing
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3"
      aria-busy={isSubmitting}
      aria-labelledby={`${formId}-title`}
    >
      <h3 id={`${formId}-title`} className="font-serif text-base font-semibold text-navy-700">Schedule a Showing</h3>
      <p className="text-xs text-slate-500">{propertyAddress}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${formId}-first-name`} className="block text-xs font-medium text-slate-600 mb-1">First name</label>
          <input id={`${formId}-first-name`} name="firstName" autoComplete="given-name" required placeholder="First name" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
        </div>
        <div>
          <label htmlFor={`${formId}-last-name`} className="block text-xs font-medium text-slate-600 mb-1">Last name</label>
          <input id={`${formId}-last-name`} name="lastName" autoComplete="family-name" required placeholder="Last name" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
        </div>
      </div>
      <div>
        <label htmlFor={`${formId}-email`} className="block text-xs font-medium text-slate-600 mb-1">Email</label>
        <input id={`${formId}-email`} name="email" type="email" autoComplete="email" required placeholder="Email" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
      </div>
      <div>
        <label htmlFor={`${formId}-phone`} className="block text-xs font-medium text-slate-600 mb-1">Phone (optional)</label>
        <input id={`${formId}-phone`} name="phone" type="tel" autoComplete="tel" placeholder="Phone (optional)" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${formId}-date`} className="block text-xs font-medium text-slate-600 mb-1">Preferred date (optional)</label>
          <input id={`${formId}-date`} name="preferredDate" type="date" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
        </div>
        <div>
          <label htmlFor={`${formId}-time`} className="block text-xs font-medium text-slate-600 mb-1">Preferred time (optional)</label>
          <select id={`${formId}-time`} name="preferredTime" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600">
            <option value="">Any time</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor={`${formId}-message`} className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
        <textarea id={`${formId}-message`} name="message" placeholder="Any notes for the agent? (optional)" rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-navy-600" />
      </div>
      {submitError && (
        <p role="alert" className="text-sm text-crimson-600">
          {submitError}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2.5 bg-navy-600 text-white font-semibold rounded-xl hover:bg-navy-700 transition-colors text-sm disabled:opacity-50"
      >
        {isSubmitting ? "Sending..." : submitError ? "Try Again" : "Request Showing"}
      </button>
    </form>
  );
}
