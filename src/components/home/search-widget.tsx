"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRICE_OPTIONS = [
  { value: "", label: "Any Price" },
  { value: "0-200000", label: "Under $200K" },
  { value: "200000-350000", label: "$200K – $350K" },
  { value: "350000-500000", label: "$350K – $500K" },
  { value: "500000-750000", label: "$500K – $750K" },
  { value: "750000-1000000", label: "$750K – $1M" },
  { value: "1000000-", label: "$1M+" },
];

const BED_OPTIONS = [
  { value: "", label: "Any Beds" },
  { value: "1", label: "1+ Beds" },
  { value: "2", label: "2+ Beds" },
  { value: "3", label: "3+ Beds" },
  { value: "4", label: "4+ Beds" },
  { value: "5", label: "5+ Beds" },
];

const BATH_OPTIONS = [
  { value: "", label: "Any Baths" },
  { value: "1", label: "1+ Baths" },
  { value: "2", label: "2+ Baths" },
  { value: "3", label: "3+ Baths" },
  { value: "4", label: "4+ Baths" },
];

export function SearchWidget() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (price) {
      const [min, max] = price.split("-");
      if (min) params.set("minPrice", min);
      if (max) params.set("maxPrice", max);
    }
    if (beds) params.set("beds", beds);
    if (baths) params.set("baths", baths);
    router.push(`/properties${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const selectClass =
    "w-full h-full bg-transparent text-slate-700 text-sm font-medium appearance-none focus:outline-none cursor-pointer";

  return (
    <form
      onSubmit={handleSearch}
      className="mx-auto w-full max-w-4xl"
      role="search"
      aria-label="Property search"
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden border border-white/60">
        {/* Label bar */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-navy-600">
            Find Your Perfect Home
          </p>
        </div>

        {/* Fields row */}
        <div className="flex flex-col sm:flex-row">
          {/* Location */}
          <div className="flex-[2] flex items-center gap-3 px-5 py-3 sm:border-r border-slate-100 border-b sm:border-b-0">
            <svg className="h-4 w-4 text-crimson-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-semibold tracking-wider uppercase text-slate-400 mb-0.5">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, ZIP, or neighborhood"
                className="w-full text-sm font-medium text-slate-700 placeholder:text-slate-400 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Price */}
          <div className="flex-1 flex items-center gap-3 px-5 py-3 sm:border-r border-slate-100 border-b sm:border-b-0">
            <svg className="h-4 w-4 text-crimson-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 relative">
              <label className="block text-[10px] font-semibold tracking-wider uppercase text-slate-400 mb-0.5">
                Price
              </label>
              <select value={price} onChange={(e) => setPrice(e.target.value)} className={selectClass}>
                {PRICE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Beds */}
          <div className="flex-1 flex items-center gap-3 px-5 py-3 sm:border-r border-slate-100 border-b sm:border-b-0">
            <svg className="h-4 w-4 text-crimson-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <div className="flex-1 relative">
              <label className="block text-[10px] font-semibold tracking-wider uppercase text-slate-400 mb-0.5">
                Bedrooms
              </label>
              <select value={beds} onChange={(e) => setBeds(e.target.value)} className={selectClass}>
                {BED_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Baths */}
          <div className="flex-1 flex items-center gap-3 px-5 py-3 border-b sm:border-b-0">
            <svg className="h-4 w-4 text-crimson-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="flex-1 relative">
              <label className="block text-[10px] font-semibold tracking-wider uppercase text-slate-400 mb-0.5">
                Bathrooms
              </label>
              <select value={baths} onChange={(e) => setBaths(e.target.value)} className={selectClass}>
                {BATH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search button */}
          <div className="flex items-stretch">
            <button
              type="submit"
              className="w-full sm:w-auto px-7 py-4 bg-crimson-600 text-white font-semibold text-sm tracking-wide hover:bg-crimson-700 active:bg-crimson-800 transition-colors duration-200 flex items-center gap-2 justify-center whitespace-nowrap"
              aria-label="Search properties"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
