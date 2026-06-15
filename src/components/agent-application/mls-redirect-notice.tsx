"use client";

interface MlsRedirectNoticeProps {
  riusaUrl: string;
  intendsToObtain: boolean;
  onBack: () => void;
}

export function MlsRedirectNotice({ riusaUrl, intendsToObtain, onBack }: MlsRedirectNoticeProps) {
  const isPlaceholder = !riusaUrl || riusaUrl === "#";

  return (
    <div className="space-y-5 text-center">
      <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-navy-50 mx-auto">
        <svg className="h-6 w-6 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      </div>

      <div className="space-y-3">
        <h2 className="font-serif text-2xl text-navy-700">MLS Access Is Required</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Every HomeWise Agent must hold active MLS access. Since you don&apos;t have it yet,
          {intendsToObtain ? " here's how to get it." : " you'll need to obtain it first."}
        </p>
        <div className="rounded-xl bg-cream-50 border border-slate-100 p-4 text-left">
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong className="text-navy-700">Realty International USA</strong> is our licensing
            partner and the on-ramp to becoming a HomeWise Agent. There you can get licensed and
            MLS-enabled. Once you have active MLS access, you can join HomeWise — where membership
            is always <strong className="text-navy-700">free</strong> for our agents.
          </p>
        </div>
      </div>

      {isPlaceholder ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-700">
            The Realty International USA sign-up site is launching soon. Please check back shortly.
          </p>
        </div>
      ) : (
        <a
          href={riusaUrl}
          className="w-full h-12 rounded-xl bg-crimson-600 text-white font-semibold text-sm hover:bg-crimson-700 active:bg-crimson-800 transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2"
        >
          Continue to Realty International USA
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      )}

      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-slate-500 hover:text-navy-700 transition-colors"
      >
        ← Back
      </button>
    </div>
  );
}
