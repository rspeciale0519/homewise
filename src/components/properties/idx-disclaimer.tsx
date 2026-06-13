export function IdxDisclaimer() {
  return (
    <div className="mt-8 py-4 px-5 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex items-start gap-3">
        <svg className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-xs text-slate-500 leading-relaxed">
          <p className="mb-1">
            Based on information submitted to the MLS GRID as of the date shown.
            All data is obtained from various sources and may not have been verified
            by broker or MLS GRID. Supplied Open House Information is subject to
            change without notice. All information should be independently reviewed
            and verified for accuracy. Properties may or may not be listed by the
            office/agent presenting the information.
          </p>
          <p>
            &copy; {new Date().getFullYear()} Stellar MLS. All rights reserved.
            The data relating to real estate for sale on this website comes in part
            from the Internet Data Exchange (IDX) program of Stellar MLS. IDX
            information is provided exclusively for personal, non-commercial use and
            may not be used for any purpose other than to identify prospective
            properties consumers may be interested in purchasing.
          </p>
          <p className="mt-1">
            Some IDX listings have been excluded from this website. When a sold
            listing is shown, properties displayed may be listed or sold by various
            participants in the MLS.
          </p>
          <p className="mt-1">
            Any use or search of the data on this website, other than by a consumer
            looking to purchase real estate, is prohibited. Listings courtesy of
            Stellar MLS as distributed by MLS GRID.
          </p>
        </div>
      </div>
    </div>
  );
}
