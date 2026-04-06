"use client";

import { MarketTrendChart } from "@/components/market/market-trend-chart";
import DOMPurify from "isomorphic-dompurify";

interface StatPeriod {
  id: string;
  period: string;
  activeCount: number;
  soldCount: number;
  medianPrice: number;
  avgPrice: number;
  saleToListRatio: number;
  avgDom: number;
  monthsOfInventory: number;
  newListings: number;
  pricePerSqft: number;
}

interface MarketStatsViewProps {
  city: string;
  stats: StatPeriod[];
  seoContent: string | null;
}

export function MarketStatsView({ city, stats, seoContent }: MarketStatsViewProps) {
  const latest = stats[0];
  const sanitizedSeoContent = seoContent ? DOMPurify.sanitize(seoContent) : null;

  if (!latest) {
    return (
      <div className="text-center py-16">
        <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <p className="text-slate-500">No market data available for {city} yet.</p>
        <p className="text-sm text-slate-400 mt-1">Check back soon!</p>
      </div>
    );
  }

  const statCards = [
    { label: "Active Listings", value: latest.activeCount.toLocaleString(), icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", color: "bg-blue-50 text-blue-600" },
    { label: "Median Price", value: `$${latest.medianPrice.toLocaleString()}`, icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "bg-green-50 text-green-600" },
    { label: "Avg Days on Market", value: String(latest.avgDom), icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "bg-amber-50 text-amber-600" },
    { label: "Sold This Month", value: latest.soldCount.toLocaleString(), icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "bg-purple-50 text-purple-600" },
    { label: "Sale-to-List Ratio", value: `${(latest.saleToListRatio * 100).toFixed(1)}%`, icon: "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z", color: "bg-navy-50 text-navy-600" },
    { label: "Months of Inventory", value: latest.monthsOfInventory.toFixed(1), icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", color: "bg-crimson-50 text-crimson-600" },
    { label: "New Listings (30d)", value: latest.newListings.toLocaleString(), icon: "M12 4v16m8-8H4", color: "bg-indigo-50 text-indigo-600" },
    { label: "Price per Sqft", value: `$${latest.pricePerSqft.toLocaleString()}`, icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z", color: "bg-teal-50 text-teal-600" },
  ];

  return (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                </svg>
              </div>
            </div>
            <p className="text-lg sm:text-xl font-bold text-navy-700">{card.value}</p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Trend Chart */}
      {stats.length > 1 && (
        <MarketTrendChart stats={[...stats].reverse()} />
      )}

      {/* SEO Content / Neighborhood Guide */}
      {sanitizedSeoContent && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-8">
          <div className="prose prose-slate prose-sm sm:prose-base max-w-none" dangerouslySetInnerHTML={{ __html: sanitizedSeoContent }} />
        </div>
      )}

      {/* CTA */}
      <div className="bg-gradient-to-br from-navy-600 to-navy-700 rounded-2xl p-6 sm:p-8 text-center text-white">
        <h3 className="font-serif text-xl sm:text-2xl font-bold mb-2">Ready to explore {city}?</h3>
        <p className="text-sm text-navy-100 mb-5 max-w-md mx-auto">Connect with a local expert who knows this market inside and out.</p>
        <a href="/contact" className="inline-block px-6 py-3 bg-white text-navy-700 font-semibold rounded-xl hover:bg-navy-50 transition-colors">
          Talk to an Agent
        </a>
      </div>
    </div>
  );
}
