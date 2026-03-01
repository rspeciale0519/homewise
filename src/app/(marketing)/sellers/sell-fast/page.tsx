import type { Metadata } from "next";
import { ArticleLayout } from "@/components/content/article-layout";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Sell Your Home Fast",
  description: "Three proven strategies to sell your Central Florida home quickly without leaving money on the table.",
  path: "/sellers/sell-fast",
});

const STRATEGIES = [
  {
    number: "01",
    title: "Price It Right from Day One",
    body: `The single biggest mistake sellers make is pricing too high and planning to "come down later." Overpriced homes sit on the market, grow stale, and ultimately sell for less than a correctly-priced home would have.

Buyers in today's market are sophisticated. They've seen every comparable home in your price range. When your home is priced correctly, it generates multiple showings in the first weekend — often leading to multiple offers and a sale above asking.

Your Home Wise agent will provide a detailed Comparative Market Analysis (CMA) using recent sales data from your specific neighborhood. We don't guess — we price strategically.`,
    tips: [
      "Price within 3% of true market value for fastest results",
      "Review comps from the past 90 days, not 6 months",
      "Factor in active competition, not just past sales",
      "Adjust quickly if showings happen but offers don't",
    ],
  },
  {
    number: "02",
    title: "Professional Photography & Marketing",
    body: `Over 95% of buyers begin their home search online. The photos of your home are your first — and sometimes only — chance to make an impression. Grainy, dark, or poorly composed photos result in fewer showings, regardless of how beautiful your home actually is.

Home Wise Realty Group provides professional photography for our listings, including wide-angle interior shots, aerial drone photography where appropriate, and twilight exterior photos that make your home stand out in search results.

We pair this with maximum MLS exposure, social media promotion, email marketing to our buyer agent network, and targeted digital advertising.`,
    tips: [
      "Professional photography can increase sale price by $3,000–$11,000",
      "Drone aerials are especially effective for properties with land or unique features",
      "Virtual tours keep buyers engaged longer and reduce tire-kicker showings",
      "Twilight photos often generate 3x more saves on listing platforms",
    ],
  },
  {
    number: "03",
    title: "Prepare Your Home Strategically",
    body: `You don't need to renovate to sell fast — but you do need to address the things buyers will use to negotiate down your price or walk away entirely. The goal is to eliminate objections before they arise.

Focus on repairs that buyers and inspectors will flag: HVAC service, roof condition, water heater age, electrical panel updates, and plumbing. These are not glamorous investments, but they prevent deals from falling apart at the inspection stage.

Beyond repairs, strategic staging and de-personalization let buyers envision the home as theirs — which is what drives emotional offers.`,
    tips: [
      "Pre-listing inspection removes surprises and builds buyer confidence",
      "Address all deferred maintenance before listing",
      "Fresh paint and new light fixtures: highest visual ROI",
      "Remove personal photos and highly personal decor",
    ],
  },
];

const RELATED = [
  { label: "Home Staging Tips", href: "/sellers/staging" },
  { label: "Sounds & Smells", href: "/sellers/sounds-and-smells" },
  { label: "Seller Advice", href: "/sellers/seller-advice" },
  { label: "Free Home Evaluation", href: "/home-evaluation" },
];

export default function SellFastPage() {
  return (
    <ArticleLayout
      eyebrow="For Sellers"
      title="Sell Your Home Fast"
      subtitle="Three strategies our top agents use to generate immediate buyer interest and strong offers."
      breadcrumbs={[{ label: "For Sellers", href: "/sellers" }, { label: "Sell Fast" }]}
      relatedLinks={RELATED}
      ctaTitle="Price Your Home to Sell"
      ctaHref="/home-evaluation"
      ctaLabel="Get Free CMA"
    >
      <p>
        Selling fast isn&apos;t about luck — it&apos;s about preparation, positioning, and execution. Homes that sell
        quickly, and for the best price, do three things right from the start. Here&apos;s the playbook our top agents follow.
      </p>

      {STRATEGIES.map((s, i) => (
        <div key={s.number} className="not-prose mb-10">
          {i > 0 && <hr className="border-slate-100 mb-10" />}
          <div className="flex items-start gap-4 mb-4">
            <span className="font-serif text-5xl font-bold text-navy-100 leading-none select-none">{s.number}</span>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-navy-700 leading-tight pt-2">{s.title}</h2>
          </div>
          {s.body.split("\n\n").map((para, j) => (
            <p key={j} className="text-slate-600 leading-relaxed mb-4 text-base">{para}</p>
          ))}
          <div className="bg-cream-50 rounded-xl border border-cream-200 p-5 mt-4">
            <p className="text-xs font-semibold tracking-widest uppercase text-navy-600 mb-3">Key Takeaways</p>
            <ul className="space-y-2">
              {s.tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <svg className="h-4 w-4 text-crimson-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </ArticleLayout>
  );
}
