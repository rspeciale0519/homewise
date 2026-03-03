import Link from "next/link";
import type { Property } from "@/providers/property-provider";
import { PHONE } from "@/lib/constants";

interface ListingDetailSidebarProps {
  property: Property;
}

export function ListingDetailSidebar({ property }: ListingDetailSidebarProps) {
  return (
    <aside className="lg:sticky lg:top-24 space-y-6">
      {/* Agent Attribution */}
      {property.listingAgentName && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
          <p className="text-xs text-slate-400 mb-1">Listing Agent</p>
          <p className="text-sm font-semibold text-navy-700">{property.listingAgentName}</p>
          {property.listingOfficeName && (
            <p className="text-xs text-slate-500">{property.listingOfficeName}</p>
          )}
          {property.listingAgentPhone && (
            <a
              href={`tel:${property.listingAgentPhone.replace(/[^0-9+]/g, "")}`}
              className="text-xs text-navy-600 hover:text-navy-800 mt-1 inline-block"
            >
              {property.listingAgentPhone}
            </a>
          )}
        </div>
      )}

      {/* Contact CTA */}
      <div className="bg-navy-700 rounded-2xl p-6 text-white">
        <div className="h-10 w-10 rounded-xl bg-crimson-600 flex items-center justify-center mb-4">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        <h3 className="font-serif text-xl font-semibold mb-2">Interested in This Property?</h3>
        <p className="text-slate-300 text-sm leading-relaxed mb-5">
          Contact one of our agents for more details, to schedule a showing, or to make an offer.
        </p>
        <Link href="/agents" className="block w-full text-center px-4 py-3 rounded-xl bg-crimson-600 text-white text-sm font-semibold hover:bg-crimson-700 transition-colors mb-2">
          Find an Agent
        </Link>
        <a href={`tel:${PHONE.replace(/[^0-9+]/g, "")}`} className="block w-full text-center px-4 py-3 rounded-xl border border-navy-500 text-slate-300 text-sm font-medium hover:bg-navy-600 transition-colors">
          Call {PHONE}
        </a>
      </div>

      {/* Schedule showing */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
        <h3 className="font-serif text-base font-semibold text-navy-700 mb-3">Schedule a Showing</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-4">
          Ready to see this property in person? Contact us to arrange a private showing at your convenience.
        </p>
        <Link href="/buyers/request" className="block w-full text-center px-4 py-2.5 rounded-xl bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 transition-colors">
          Request Showing
        </Link>
      </div>

      {/* Open House Schedule */}
      {property.openHouseSchedule && property.openHouseSchedule.length > 0 && (
        <div className="bg-crimson-50 rounded-2xl border border-crimson-100 p-6">
          <h3 className="font-serif text-base font-semibold text-navy-700 mb-3">Open House</h3>
          <div className="space-y-2">
            {property.openHouseSchedule.map((slot, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <svg className="h-4 w-4 text-crimson-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-navy-700 font-medium">{slot.date}</span>
                <span className="text-slate-500">{slot.startTime}–{slot.endTime}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Virtual tour */}
      {property.virtualTourUrl && (
        <a
          href={property.virtualTourUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-navy-50 text-navy-700 text-sm font-semibold hover:bg-navy-100 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Virtual Tour
        </a>
      )}

      {/* Selling CTA */}
      <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6">
        <h3 className="font-serif text-base font-semibold text-navy-700 mb-3">Selling Your Home?</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-4">
          Get a free Comparative Market Analysis to find out what your home is worth in today&apos;s market.
        </p>
        <Link href="/home-evaluation" className="block w-full text-center px-4 py-2.5 rounded-xl border-2 border-crimson-600 text-crimson-600 text-sm font-semibold hover:bg-crimson-600 hover:text-white transition-colors">
          Free Home Evaluation
        </Link>
      </div>
    </aside>
  );
}
