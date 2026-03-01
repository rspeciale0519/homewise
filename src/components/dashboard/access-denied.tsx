import { PHONE } from "@/lib/constants";

export function AccessDenied() {
  return (
    <div className="p-6 sm:p-8 lg:p-10">
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
          <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 className="font-serif text-2xl font-semibold text-navy-700 mb-3">Agent Access Required</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          This area is for Home Wise Realty agents. If you are an agent, contact the office for your registration link.
        </p>
        <p className="text-sm text-slate-500">
          Office:{" "}
          <a
            href={`tel:${PHONE.replace(/\D/g, "")}`}
            className="text-navy-600 font-medium hover:text-crimson-600 transition-colors"
          >
            {PHONE}
          </a>
        </p>
      </div>
    </div>
  );
}
