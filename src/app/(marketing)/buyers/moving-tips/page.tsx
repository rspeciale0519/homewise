import type { Metadata } from "next";
import { ArticleLayout } from "@/components/content/article-layout";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Moving Tips for Central Florida Home Buyers",
  description: "Six proven tips to make your move smoother and less stressful, plus trusted local moving resources.",
  path: "/buyers/moving-tips",
});

const TIPS = [
  {
    icon: "📋",
    title: "Start Planning 8 Weeks Out",
    body: "The biggest moving mistake is underestimating lead time. Quality local movers book out 4–6 weeks during peak season (May–August). Start getting quotes at least 8 weeks before your move date. Create a timeline with weekly milestones: utilities transfer, address changes, packing schedule, and moving day logistics.",
  },
  {
    icon: "📦",
    title: "Declutter Before You Pack",
    body: "Every item you move costs money and time. Moving is the perfect forcing function for a serious declutter. Donate, sell, or discard anything you haven't used in 18 months. Florida thrift stores (Goodwill, Habitat ReStores) accept furniture, appliances, and housewares. What's left is what you actually need.",
  },
  {
    icon: "🔌",
    title: "Transfer Utilities Before Closing",
    body: "In Central Florida, electricity is provided by Duke Energy Florida, Florida Power & Light, or OUC depending on your municipality. Schedule your utility transfer 2 weeks before closing — not the day of. Also transfer: internet (Spectrum, AT&T), water (typically city/county), and don't forget homeowner's insurance must be active at closing.",
  },
  {
    icon: "📮",
    title: "Change Your Address Early",
    body: "USPS mail forwarding takes 10 business days to activate. Change your address at USPS.com as soon as you have your new address. Then update directly: bank accounts, employer payroll, subscriptions, voter registration (required in Florida), vehicle registration, and driver's license (must update within 30 days of moving in Florida).",
  },
  {
    icon: "🌡️",
    title: "Account for Florida's Heat",
    body: "Moving in July in Central Florida means moving in 95°F heat with near-100% humidity. Start as early as possible (7am ideally), stay hydrated, take breaks in the AC, and don't pack your HVAC remote or fans last. If your move date is flexible, November through March is dramatically more comfortable and movers are less busy.",
  },
  {
    icon: "🏠",
    title: "Do a Final Walk-Through With Fresh Eyes",
    body: "Once movers are done and boxes are in, walk every room before signing off. Check inside every closet, cabinet, and the garage. Test every door lock, window, and light switch. Run the faucets and check under sinks for drips. Note anything that needs immediate attention on a punch list — address it before settling in fully.",
  },
];

const RESOURCES = [
  {
    name: "Florida DMV Address Change",
    description: "Required within 30 days of moving. Update online at flhsmv.gov.",
    href: "https://www.flhsmv.gov/driver-licenses-id-cards/",
  },
  {
    name: "Florida Voter Registration",
    description: "Register or update your address at registertovoteflorida.gov.",
    href: "https://registertovoteflorida.gov/",
  },
  {
    name: "USPS Mail Forwarding",
    description: "Set up mail forwarding from your old address at moversguide.usps.com.",
    href: "https://moversguide.usps.com/",
  },
  {
    name: "Orlando Utilities (OUC)",
    description: "OUC serves the City of Orlando for electric and water services.",
    href: "https://www.ouc.com/",
  },
];

const RELATED = [
  { label: "Preparing to Buy", href: "/buyers/preparing" },
  { label: "Choosing a Location", href: "/buyers/location" },
  { label: "Condo vs. House", href: "/buyers/condo-vs-house" },
  { label: "Search Properties", href: "/properties" },
];

export default function MovingTipsPage() {
  return (
    <ArticleLayout
      eyebrow="For Buyers"
      title="Moving Tips"
      subtitle="Six ways to take the stress out of moving day — and the weeks leading up to it."
      breadcrumbs={[{ label: "For Buyers", href: "/buyers" }, { label: "Moving Tips" }]}
      relatedLinks={RELATED}
      ctaTitle="Find Your Next Home"
      ctaHref="/properties"
      ctaLabel="Browse Properties"
    >
      <p>
        Moving is consistently rated one of life&apos;s most stressful events. But most of that stress is preventable
        with proper lead time and a systematic approach. These tips come from our agents and the hundreds of buyers
        we&apos;ve helped relocate to Central Florida.
      </p>

      <div className="not-prose grid grid-cols-1 gap-5 my-8">
        {TIPS.map((tip) => (
          <div key={tip.title} className="flex gap-5 bg-white rounded-2xl border border-slate-100 shadow-card p-6">
            <div className="text-3xl shrink-0 mt-1">{tip.icon}</div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-navy-700 mb-2">{tip.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{tip.body}</p>
            </div>
          </div>
        ))}
      </div>

      <h2>Florida-Specific Resources</h2>
      <p>These resources are specific to moving within or to Florida — bookmark them before moving day.</p>

      <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
        {RESOURCES.map((resource) => (
          <a
            key={resource.name}
            href={resource.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-cream-50 rounded-xl border border-cream-200 p-5 hover:border-navy-300 hover:shadow-soft transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-semibold text-navy-700 text-sm group-hover:text-navy-900 transition-colors">{resource.name}</h3>
              <svg className="h-4 w-4 text-slate-400 shrink-0 group-hover:text-navy-600 transition-colors mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{resource.description}</p>
          </a>
        ))}
      </div>

      <div className="not-prose rounded-2xl bg-navy-700 text-white p-6 my-8">
        <p className="font-serif text-xl font-semibold mb-2">Ask Us for Referrals</p>
        <p className="text-slate-300 text-sm leading-relaxed">
          Our agents have worked with dozens of local moving companies and can recommend vetted, licensed movers
          for every budget. We can also connect you with utility providers, locksmith services, and home service
          professionals to help you get settled quickly. This is what local expertise looks like.
        </p>
      </div>
    </ArticleLayout>
  );
}
