"use client";

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

  if (!latest) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">No market data available for {city} yet. Check back soon!</p>
      </div>
    );
  }

  const statCards = [
    { label: "Active Listings", value: latest.activeCount.toLocaleString(), color: "text-blue-600" },
    { label: "Median Price", value: `$${latest.medianPrice.toLocaleString()}`, color: "text-green-600" },
    { label: "Avg Days on Market", value: String(latest.avgDom), color: "text-amber-600" },
    { label: "Sold This Month", value: latest.soldCount.toLocaleString(), color: "text-purple-600" },
    { label: "Sale-to-List Ratio", value: `${(latest.saleToListRatio * 100).toFixed(1)}%`, color: "text-navy-600" },
    { label: "Months of Inventory", value: latest.monthsOfInventory.toFixed(1), color: "text-crimson-600" },
    { label: "New Listings (30d)", value: latest.newListings.toLocaleString(), color: "text-indigo-600" },
    { label: "Price per Sqft", value: `$${latest.pricePerSqft.toLocaleString()}`, color: "text-teal-600" },
  ];

  return (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">{card.label}</p>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Trend Table */}
      {stats.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-8">
          <h2 className="text-lg font-semibold text-navy-700 p-4 border-b border-slate-200">6-Month Trends</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Period</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Active</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Median Price</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Avg DOM</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Sold</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">$/Sqft</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="px-4 py-2 font-medium">{s.period}</td>
                    <td className="px-4 py-2 text-right">{s.activeCount}</td>
                    <td className="px-4 py-2 text-right">${s.medianPrice.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{s.avgDom}</td>
                    <td className="px-4 py-2 text-right">{s.soldCount}</td>
                    <td className="px-4 py-2 text-right">${s.pricePerSqft}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEO Content / Neighborhood Guide */}
      {seoContent && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: seoContent }} />
        </div>
      )}

      {/* CTA */}
      <div className="mt-8 bg-navy-50 rounded-xl p-6 text-center">
        <h3 className="font-serif text-xl font-bold text-navy-700 mb-2">Ready to explore {city}?</h3>
        <p className="text-sm text-slate-600 mb-4">Connect with a local expert who knows this market inside and out.</p>
        <a href="/contact" className="inline-block px-6 py-3 bg-navy-600 text-white font-semibold rounded-xl hover:bg-navy-700 transition-colors">
          Talk to an Agent
        </a>
      </div>
    </div>
  );
}
