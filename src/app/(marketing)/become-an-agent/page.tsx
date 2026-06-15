import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationForm } from "@/components/agent-application/application-form";

export const metadata: Metadata = {
  title: "Become a HomeWise Agent",
  description:
    "Apply to join HomeWise Realty Group. Membership is free for licensed agents with active MLS access — apply for review by our corporate office.",
};

export default function BecomeAnAgentPage() {
  const riusaUrl = process.env.NEXT_PUBLIC_RIUSA_URL ?? "#";

  return (
    <section className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4">
      <div className="absolute inset-0 bg-cream-50" />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-navy-50/60 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-crimson-50/40 blur-3xl -translate-x-1/3 translate-y-1/3" />

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="bg-white rounded-2xl shadow-elevated border border-slate-100 p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-navy-600 mb-4">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h1 className="font-serif text-display-sm text-navy-700 mb-2">Become a HomeWise Agent</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Free for licensed agents — applications are reviewed by our corporate office.
            </p>
          </div>

          <ApplicationForm riusaUrl={riusaUrl} />

          <p className="mt-6 text-center text-sm text-slate-500">
            Already a HomeWise Agent?{" "}
            <Link href="/login" className="font-medium text-crimson-600 hover:text-crimson-700 transition-colors">
              Log In
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed">
          HomeWise Agents never pay a membership fee. Active MLS access is required to join.
        </p>
      </div>
    </section>
  );
}
