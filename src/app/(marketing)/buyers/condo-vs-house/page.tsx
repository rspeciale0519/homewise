import type { Metadata } from "next";
import { ArticleLayout } from "@/components/content/article-layout";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Condo vs. House: Which Is Right for You?",
  description: "The real differences between buying a condo and a single-family home in Central Florida — cost, lifestyle, and long-term value.",
  path: "/buyers/condo-vs-house",
});

const COMPARISON = [
  {
    category: "Cost & Financing",
    condo: [
      "Often lower purchase price in the same area",
      "HOA fees ($200–$800/month) replace many maintenance costs",
      "Condo association fees may include water, trash, exterior insurance",
      "Financing can be harder — lenders scrutinize condo association health",
      "FHA loans require condo to be on the FHA-approved list",
    ],
    house: [
      "Higher purchase price, but no HOA (or lower HOA in most cases)",
      "You pay all maintenance — budget 1–2% of home value annually",
      "More financing options with fewer lender restrictions",
      "Lower monthly insurance if you maintain only the structure (not exterior)",
    ],
  },
  {
    category: "Lifestyle & Space",
    condo: [
      "Typically less square footage — ideal for downsizers or singles",
      "Shared amenities: pools, gyms, clubhouses often included",
      "Less privacy — shared walls, parking, and common areas",
      "No yard maintenance, no lawn equipment needed",
      "Building security and controlled access in many complexes",
    ],
    house: [
      "More interior space and private outdoor area",
      "Full control over your yard, landscaping, and exterior",
      "Typically more storage (garage, attic, full basement occasionally)",
      "Greater privacy — no shared walls in detached homes",
      "Freedom to renovate, expand, or modify without board approval",
    ],
  },
  {
    category: "Maintenance Responsibility",
    condo: [
      "Exterior, roof, and common areas maintained by the association",
      "Interior maintenance is your responsibility",
      "Special assessments can arise — reserve fund health is critical to check",
      "Less hands-on work, but you cede control over exterior decisions",
    ],
    house: [
      "You own everything — land, structure, systems, and mechanicals",
      "Full responsibility for roof, HVAC, plumbing, electrical, and landscaping",
      "Higher maintenance ceiling, but no surprise association assessments",
      "Freedom to handle, defer, or hire out any maintenance project",
    ],
  },
  {
    category: "Investment & Resale",
    condo: [
      "Generally appreciates more slowly than single-family homes in the same market",
      "Resale can be slower if the association has financial problems",
      "More supply competition from identical units in the same building",
      "Strong rental demand in tourist and urban corridors (Kissimmee, downtown Orlando)",
    ],
    house: [
      "Historically stronger long-term appreciation in Central Florida",
      "Land ownership adds intrinsic value that condos lack",
      "Broader buyer pool — families, investors, and downsizers all compete",
      "Short-term rental potential (subject to HOA and local ordinances)",
    ],
  },
];

const BEST_FOR = [
  {
    type: "Condo",
    color: "navy",
    profiles: [
      "First-time buyers with tight budgets in high-cost areas",
      "Retirees or downsizers who want low maintenance",
      "Buyers near downtown Orlando or tourist corridors seeking rental income",
      "Frequent travelers who want a lock-and-leave lifestyle",
    ],
  },
  {
    type: "Single-Family Home",
    color: "crimson",
    profiles: [
      "Families with children who need space and school district access",
      "Buyers planning long-term renovations or additions",
      "Investors seeking strong appreciation and broad resale potential",
      "Buyers who value privacy, yard space, and maximum lifestyle flexibility",
    ],
  },
];

const RELATED = [
  { label: "Preparing to Buy", href: "/buyers/preparing" },
  { label: "Choosing a Location", href: "/buyers/location" },
  { label: "Moving Tips", href: "/buyers/moving-tips" },
  { label: "Search Properties", href: "/properties" },
];

export default function CondoVsHousePage() {
  return (
    <ArticleLayout
      eyebrow="For Buyers"
      title="Condo vs. House"
      subtitle="It's not just a budget decision. It's a lifestyle decision. Here's the honest breakdown of what each property type really means for Central Florida buyers."
      breadcrumbs={[{ label: "For Buyers", href: "/buyers" }, { label: "Condo vs. House" }]}
      relatedLinks={RELATED}
      ctaTitle="Find Your Perfect Property"
      ctaHref="/properties"
      ctaLabel="Browse Properties"
    >
      <p>
        The condo-vs-house decision is one of the most common buyer crossroads — and the right answer depends almost
        entirely on your life stage, budget, and lifestyle priorities. Neither is universally better.
        Here&apos;s how to think through it clearly.
      </p>

      <div className="not-prose space-y-8 my-8">
        {COMPARISON.map((section) => (
          <div key={section.category} className="rounded-2xl border border-slate-100 overflow-hidden shadow-card">
            <div className="bg-navy-700 px-6 py-4">
              <h2 className="font-serif text-lg font-semibold text-white">{section.category}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2 w-2 rounded-full bg-navy-400" />
                  <p className="font-semibold text-navy-700 text-sm">Condo</p>
                </div>
                <ul className="space-y-2.5">
                  {section.condo.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <svg className="h-4 w-4 text-navy-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 bg-cream-50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2 w-2 rounded-full bg-crimson-500" />
                  <p className="font-semibold text-crimson-700 text-sm">Single-Family Home</p>
                </div>
                <ul className="space-y-2.5">
                  {section.house.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <svg className="h-4 w-4 text-crimson-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2>Who Should Buy What</h2>
      <p>Here&apos;s a simple framework based on buyer profiles — not a formula, but a starting point.</p>

      <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-5 my-6">
        {BEST_FOR.map((item) => (
          <div
            key={item.type}
            className={`rounded-2xl p-6 ${item.color === "navy" ? "bg-navy-700 text-white" : "bg-crimson-600 text-white"}`}
          >
            <p className={`text-xs font-semibold tracking-[0.2em] uppercase mb-3 ${item.color === "navy" ? "text-slate-400" : "text-crimson-200"}`}>
              Best For
            </p>
            <h3 className="font-serif text-2xl font-semibold mb-4">{item.type}</h3>
            <ul className="space-y-2.5">
              {item.profiles.map((profile) => (
                <li key={profile} className={`flex items-start gap-2.5 text-sm ${item.color === "navy" ? "text-slate-300" : "text-crimson-100"}`}>
                  <svg className="h-4 w-4 shrink-0 mt-0.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {profile}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="not-prose rounded-2xl bg-cream-50 border border-cream-200 p-6 my-8">
        <p className="font-serif text-xl font-semibold text-navy-700 mb-2">Still Not Sure?</p>
        <p className="text-slate-600 text-sm leading-relaxed">
          This is exactly the conversation to have with your buyer&apos;s agent before you start searching.
          A good agent will help you clarify priorities you haven&apos;t articulated yet — and show you options
          that might surprise you. Set up a free consultation with a Home Wise buyer specialist today.
        </p>
      </div>
    </ArticleLayout>
  );
}
