"use client";

import { useState } from "react";

interface ShowingRequestFormProps {
  propertyId: string;
  propertyAddress: string;
}

export function ShowingRequestForm({ propertyId, propertyAddress }: ShowingRequestFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    await fetch("/api/showing-requests", {
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

    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <svg className="h-10 w-10 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        onClick={() => setIsOpen(true)}
        className="w-full px-4 py-3 bg-navy-600 text-white font-semibold rounded-xl hover:bg-navy-700 transition-colors text-sm"
      >
        Schedule a Showing
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="font-serif text-base font-semibold text-navy-700">Schedule a Showing</h3>
      <p className="text-xs text-slate-500">{propertyAddress}</p>
      <div className="grid grid-cols-2 gap-3">
        <input name="firstName" required placeholder="First name" className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
        <input name="lastName" required placeholder="Last name" className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
      </div>
      <input name="email" type="email" required placeholder="Email" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
      <input name="phone" type="tel" placeholder="Phone (optional)" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
      <div className="grid grid-cols-2 gap-3">
        <input name="preferredDate" type="date" className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
        <select name="preferredTime" className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600">
          <option value="">Preferred time</option>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
        </select>
      </div>
      <textarea name="message" placeholder="Any notes for the agent? (optional)" rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-navy-600" />
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2.5 bg-navy-600 text-white font-semibold rounded-xl hover:bg-navy-700 transition-colors text-sm disabled:opacity-50"
      >
        {isSubmitting ? "Sending..." : "Request Showing"}
      </button>
    </form>
  );
}
