import type { Metadata } from "next";
import { ArticleLayout } from "@/components/content/article-layout";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Preparing to Buy a Home",
  description: "What you actually need — and don't need — before starting your Central Florida home search.",
  path: "/buyers/preparing",
});

const NEED = [
  { title: "A Credit Score of 620+", body: "Most conventional loans require a minimum 620 score. FHA loans allow as low as 580 with 3.5% down. The higher your score, the better your interest rate — even a 0.5% difference can mean thousands over the life of the loan." },
  { title: "Stable Employment History", body: "Lenders want to see 2 years of consistent employment in the same field. Self-employed borrowers will need 2 years of tax returns. Recent job changes are acceptable if you stayed in the same industry." },
  { title: "Pre-Approval Letter", body: "A pre-approval letter from a lender is essential before viewing homes seriously. It tells sellers you're a qualified buyer and defines your actual budget. In competitive markets, sellers won't consider offers without one." },
  { title: "Down Payment Funds", body: "Conventional loans typically require 3–20% down. FHA: 3.5%. VA and USDA loans: 0% for qualified buyers. Florida offers down payment assistance programs through Florida Housing Finance Corporation worth investigating." },
  { title: "Funds for Closing Costs", body: "Budget 2–5% of the purchase price for closing costs (title, attorney, inspection, lender fees). These are separate from your down payment and often surprise first-time buyers." },
];

const DONT_NEED = [
  { title: "Perfect Credit", body: "A score in the 700s is great, but not required. FHA loans are specifically designed for buyers with less-than-perfect credit. Work with a lender to understand your specific options." },
  { title: "20% Down Payment", body: "This is one of the most persistent myths in real estate. Many programs allow 3–5% down. You will need to pay PMI (private mortgage insurance) until you reach 20% equity, but that's often cheaper than renting while you save." },
  { title: "The Full Price in Cash", body: "Unless you're in an ultra-competitive market making a cash offer for strategic reasons, a mortgage is the standard way to buy a home. Most sellers have no preference between cash and financed offers at the same price." },
  { title: "To Wait for the \"Perfect\" Market", body: "No one can time the market perfectly. The best time to buy is when you're financially ready and find the right home. Waiting for prices to drop has cost many buyers far more than they expected." },
];

const RELATED = [
  { label: "Choosing a Location", href: "/buyers/location" },
  { label: "Moving Tips", href: "/buyers/moving-tips" },
  { label: "Condo vs. House", href: "/buyers/condo-vs-house" },
  { label: "Search Properties", href: "/properties" },
];

export default function PreparingPage() {
  return (
    <ArticleLayout
      eyebrow="For Buyers"
      title="Preparing to Buy"
      subtitle="Clear the myths. Know the facts. Here's exactly what you need — and don't need — to buy your first home in Central Florida."
      breadcrumbs={[{ label: "For Buyers", href: "/buyers" }, { label: "Preparing to Buy" }]}
      relatedLinks={RELATED}
      ctaTitle="Search Available Homes"
      ctaHref="/properties"
      ctaLabel="Browse Properties"
    >
      <p>
        Buying a home doesn&apos;t require being rich, having perfect finances, or waiting for the ideal market conditions.
        It requires understanding what actually matters — and taking deliberate steps toward readiness.
        Here&apos;s the honest breakdown.
      </p>

      <h2>What You Actually Need</h2>

      {NEED.map((item, i) => (
        <div key={item.title} className="not-prose flex gap-5 mb-7">
          <div className="shrink-0 h-9 w-9 rounded-full bg-crimson-600 text-white font-bold text-sm flex items-center justify-center">
            {i + 1}
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-navy-700 mb-1.5">{item.title}</h3>
            <p className="text-slate-600 leading-relaxed text-sm">{item.body}</p>
          </div>
        </div>
      ))}

      <h2>What You Don&apos;t Need</h2>
      <p>These are the myths that stop qualified buyers from getting started.</p>

      {DONT_NEED.map((item) => (
        <div key={item.title} className="not-prose flex gap-4 mb-5">
          <div className="shrink-0 h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mt-0.5">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-700 text-sm mb-1">{item.title} <span className="font-normal text-emerald-700 text-xs">(myth)</span></p>
            <p className="text-slate-500 text-sm leading-relaxed">{item.body}</p>
          </div>
        </div>
      ))}

      <div className="not-prose rounded-2xl bg-navy-700 text-white p-6 my-8">
        <p className="font-serif text-xl font-semibold mb-2">Your Next Step</p>
        <p className="text-slate-300 text-sm leading-relaxed mb-0">
          Talk to a lender first — before you fall in love with a house you can&apos;t qualify for.
          Your Home Wise agent can refer you to trusted local lenders who specialize in first-time and repeat buyers.
          The conversation is free and you&apos;re not committed to anything.
        </p>
      </div>
    </ArticleLayout>
  );
}
