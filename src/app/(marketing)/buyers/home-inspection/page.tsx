import type { Metadata } from "next";
import { ArticleLayout } from "@/components/content/article-layout";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Importance of Home Inspection",
  description:
    "A comprehensive home inspection checklist for Central Florida buyers. Know what to look for before you hire a professional inspector.",
  path: "/buyers/home-inspection",
});

const CHECKLIST = [
  {
    icon: "🏗️",
    title: "Foundation & Structure",
    items: [
      "Look for cracks wider than a quarter-inch in the foundation walls or slab",
      "Check for uneven floors, sticking doors, or windows that won't close properly",
      "Examine walls for diagonal cracks radiating from door and window frames",
      "In homes with crawl spaces, check for moisture, standing water, or sagging beams",
    ],
  },
  {
    icon: "🏠",
    title: "Roof & Exterior",
    items: [
      "Look for missing, curled, or cracked shingles from ground level",
      "Check gutters for sagging, rust, or detachment from the fascia",
      "Inspect the soffit and fascia for rot, peeling paint, or pest damage",
      "Ask for the roof's age — Florida roofs typically last 15–25 years depending on material",
    ],
  },
  {
    icon: "💧",
    title: "Plumbing & Water",
    items: [
      "Run every faucet and flush every toilet — check water pressure and drainage speed",
      "Look under all sinks for moisture, stains, or active drips",
      "Check the water heater's age and condition (typical lifespan: 8–12 years)",
      "Look for water stains on ceilings and walls — especially in bathrooms and below second-floor rooms",
      "Test the main water shut-off valve to confirm it works",
    ],
  },
  {
    icon: "⚡",
    title: "Electrical Systems",
    items: [
      "Open the main electrical panel — look for proper labeling and no signs of scorching",
      "Test light switches and outlets in every room, including GFCI outlets near water",
      "Check for two-prong (ungrounded) outlets that may need updating",
      "Look for exposed wiring in the attic, garage, or unfinished areas",
    ],
  },
  {
    icon: "❄️",
    title: "HVAC & Climate Control",
    items: [
      "Turn on both the AC and heat — listen for unusual noises and confirm airflow",
      "Check the air handler and condenser unit age (Florida AC units average 10–15 years)",
      "Inspect ductwork for visible damage, disconnections, or excessive dust",
      "Ask when the system was last serviced — annual maintenance is standard",
    ],
  },
  {
    icon: "🐛",
    title: "Pest & Termite Signs",
    items: [
      "Look for pencil-thin mud tubes on foundation walls — a classic subterranean termite sign",
      "Tap exposed wood (window sills, door frames, baseboards) — hollow sound indicates damage",
      "Check attic insulation for droppings, nesting material, or gnaw marks",
      "In Florida, a WDO (Wood Destroying Organism) inspection is separate from a standard home inspection — always request one",
    ],
  },
  {
    icon: "🌿",
    title: "Exterior & Landscaping",
    items: [
      "Ensure vegetation is trimmed at least 30 inches from the house to prevent pest entry",
      "Check that the ground slopes away from the foundation for proper drainage",
      "Inspect driveways and walkways for trip hazards or significant cracking",
      "Look for standing water in the yard after rain — potential drainage or septic issues",
    ],
  },
  {
    icon: "🪟",
    title: "Windows, Doors & Interior",
    items: [
      "Open and close every window — check for broken seals (fog between panes), smooth operation, and locks",
      "Check all exterior doors for proper sealing, deadbolts, and weather stripping",
      "Look for signs of mold — musty smells, discoloration around windows, or bubbling paint",
      "Test all appliances that convey with the sale (dishwasher, range, disposal, microwave)",
    ],
  },
];

const RELATED = [
  { label: "Preparing to Buy", href: "/buyers/preparing" },
  { label: "Choosing a Location", href: "/buyers/location" },
  { label: "Condo vs. House", href: "/buyers/condo-vs-house" },
  { label: "Moving Tips", href: "/buyers/moving-tips" },
];

export default function HomeInspectionPage() {
  return (
    <ArticleLayout
      eyebrow="For Buyers"
      title="The Importance of Home Inspection"
      subtitle="A home inspection is the second most important decision-making step after financing. Here's how to evaluate a property yourself — before you hire a professional."
      breadcrumbs={[
        { label: "For Buyers", href: "/buyers" },
        { label: "Home Inspection" },
      ]}
      relatedLinks={RELATED}
      ctaTitle="Ready to Start Looking?"
      ctaHref="/properties"
      ctaLabel="Search Properties"
    >
      <p>
        Before you write an offer on any home, you should conduct your own preliminary walkthrough with a
        critical eye. This doesn&apos;t replace a professional inspection — but it helps you identify potential
        deal-breakers early, ask better questions, and avoid falling in love with a money pit.
      </p>

      <div className="not-prose rounded-2xl bg-navy-700 text-white p-6 my-8">
        <p className="font-serif text-lg font-semibold mb-2">Florida Buyer Tip</p>
        <p className="text-slate-300 text-sm leading-relaxed">
          In Florida, the standard contract gives buyers a <strong className="text-white">15-day inspection period</strong> (negotiable).
          During this window, you can hire licensed inspectors and cancel the contract if issues are found.
          Always use this protection — never waive inspections to &ldquo;win&rdquo; a competitive offer.
        </p>
      </div>

      <h2>Your Pre-Inspection Walkthrough Checklist</h2>
      <p>
        Use this checklist during open houses and private showings. You won&apos;t catch everything a
        licensed inspector will — but you&apos;ll catch enough to make smarter decisions faster.
      </p>

      <div className="not-prose space-y-6 my-8">
        {CHECKLIST.map((section) => (
          <div
            key={section.title}
            className="bg-white rounded-2xl border border-slate-100 shadow-card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{section.icon}</span>
              <h3 className="font-serif text-lg font-semibold text-navy-700">
                {section.title}
              </h3>
            </div>
            <ul className="space-y-2.5">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                  <svg
                    className="h-4 w-4 text-crimson-500 mt-0.5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4"
                    />
                  </svg>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h2>When to Walk Away</h2>
      <p>
        Not every issue is a deal-breaker. Cosmetic problems (paint, carpet, landscaping) are
        easily fixed. But structural damage, active termite infestation, a failing roof, or
        serious water intrusion can cost tens of thousands — and may indicate the seller hasn&apos;t
        maintained the home responsibly. In those cases, it&apos;s often wiser to keep searching.
      </p>

      <div className="not-prose rounded-2xl bg-crimson-600 text-white p-7 my-6">
        <p className="font-serif text-2xl font-semibold mb-3">
          &ldquo;The best $400–$600 you&apos;ll ever spend is on a licensed home inspector.&rdquo;
        </p>
        <p className="text-crimson-100 leading-relaxed">
          A professional home inspection in Central Florida typically costs $350–$600 depending on
          the home&apos;s size. Add a WDO (termite) inspection for another $75–$150 and a wind
          mitigation report for insurance savings. These investments protect you from surprises that
          could cost 100 times more after closing.
        </p>
      </div>
    </ArticleLayout>
  );
}
