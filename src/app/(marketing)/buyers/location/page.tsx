import type { Metadata } from "next";
import { ArticleLayout } from "@/components/content/article-layout";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Choosing a Location in Central Florida",
  description: "Six essential criteria to evaluate any Central Florida neighborhood before you buy.",
  path: "/buyers/location",
});

const CRITERIA = [
  {
    number: "01",
    title: "School District Quality",
    body: "Even if you don't have children, school district ratings directly affect property values and resale potential. In Central Florida, Orange, Seminole, and Osceola counties each have their own district — and ratings vary significantly by school. Research GreatSchools ratings and attend school board meetings for insight into district direction.",
    tips: [
      "Check ratings at GreatSchools.org for individual schools, not just districts",
      "Magnet and charter school programs can offset lower zoned school ratings",
      "Elementary school matters most for resale — parents buying homes with young children prioritize it heavily",
      "Seminole County consistently ranks among the top districts in Florida",
    ],
  },
  {
    number: "02",
    title: "Commute & Transportation Access",
    body: "Central Florida is a car-dependent region. Unless you're near a SunRail station or the downtown Orlando core, you'll drive. Before falling in love with a home, drive the commute yourself — at the actual time you'd be traveling. I-4, SR-417, and SR-408 congestion can add 30–45 minutes to seemingly short distances.",
    tips: [
      "Test the actual commute route during peak hours before buying",
      "SunRail connects DeBary to Poinciana — ideal for commuters along that corridor",
      "Lake Nona, Dr. Phillips, and Winter Park offer strong highway access",
      "Consider proximity to your employer's potential future locations, not just current",
    ],
  },
  {
    number: "03",
    title: "Flood Zone & Insurance Costs",
    body: "Florida's flat terrain and heavy rainfall make flood zone designation a critical factor. Homes in FEMA Special Flood Hazard Areas (zones A and AE) require mandatory flood insurance — often $1,500–$4,000 per year. Always check the FEMA Flood Map before making an offer, and ask for prior claims history on the property.",
    tips: [
      "Look up any address at msc.fema.gov — it's free",
      "Zone X (minimal flood hazard) is ideal — still consider voluntary flood insurance",
      "Flood zone can change — ask your agent about LOMA/LOMR history",
      "Factor flood insurance into your true monthly payment calculation",
    ],
  },
  {
    number: "04",
    title: "HOA Restrictions & Fees",
    body: "Most communities in Central Florida have a Homeowners Association. HOA fees range from $50/month for basic maintenance to $800+/month in luxury gated communities. More important than fees are the restrictions — some HOAs prohibit rentals, commercial vehicles, certain landscaping, or specific home modifications. Read the CC&Rs before falling in love with a home.",
    tips: [
      "Request full HOA documents during due diligence — financials, rules, board minutes",
      "Underfunded HOA reserves can mean special assessments of thousands down the road",
      "Rental restrictions matter if you ever plan to lease the property",
      "HOA fees are NOT included in your mortgage payment — budget separately",
    ],
  },
  {
    number: "05",
    title: "Future Development Plans",
    body: "Central Florida is one of the fastest-growing metros in the country. What's a quiet neighborhood today can change significantly in five years. Check with local county planning departments for approved development projects, rezoning applications, and infrastructure plans. A new interchange, commercial development, or major employer moving in can dramatically affect your quality of life and property value — positively or negatively.",
    tips: [
      "Review the county's Future Land Use Map for nearby parcels",
      "New SunRail stations and interchange plans affect property values significantly",
      "Disney, Universal, and major employers announce expansions — track them",
      "Your agent can pull recent zoning and permit activity for any area",
    ],
  },
  {
    number: "06",
    title: "Proximity to Daily Life",
    body: "Think through the full picture of your daily routine — grocery stores, healthcare, gym, restaurants, places of worship. In sprawling markets like Central Florida, 'close' can mean 20 minutes by car. The neighborhoods with the highest long-term satisfaction scores have walkable or short-drive access to essentials. Winter Park, College Park, Lake Eola Heights, and Baldwin Park consistently top livability rankings in the area.",
    tips: [
      "Walk Score and Yelp proximity to your key destinations",
      "Hospital and urgent care proximity matters more as families grow older",
      "Consider where your social circle lives — community connection affects quality of life",
      "Neighborhoods near downtown Orlando are appreciating faster than outer suburbs",
    ],
  },
];

const RELATED = [
  { label: "Preparing to Buy", href: "/buyers/preparing" },
  { label: "Moving Tips", href: "/buyers/moving-tips" },
  { label: "Condo vs. House", href: "/buyers/condo-vs-house" },
  { label: "Search Properties", href: "/properties" },
];

export default function LocationPage() {
  return (
    <ArticleLayout
      eyebrow="For Buyers"
      title="Choosing Your Location"
      subtitle="The home you can change. The neighborhood you're stuck with. Here are the six criteria that define where you should — and shouldn't — buy."
      breadcrumbs={[{ label: "For Buyers", href: "/buyers" }, { label: "Choosing a Location" }]}
      relatedLinks={RELATED}
      ctaTitle="Start Your Home Search"
      ctaHref="/properties"
      ctaLabel="Browse Properties"
    >
      <p>
        In real estate, the adage holds: <strong>location, location, location.</strong> You can renovate a kitchen,
        add a bathroom, and repaint every room — but you cannot move the house. Choosing the right neighborhood
        is the most consequential decision you&apos;ll make in your home purchase. Here&apos;s how to evaluate it systematically.
      </p>

      {CRITERIA.map((item, i) => (
        <div key={item.number} className="not-prose mb-10">
          {i > 0 && <hr className="border-slate-100 mb-10" />}
          <div className="flex items-start gap-4 mb-4">
            <span className="font-serif text-5xl font-bold text-navy-100 leading-none select-none">{item.number}</span>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-navy-700 leading-tight pt-2">{item.title}</h2>
          </div>
          <p className="text-slate-600 leading-relaxed mb-4 text-base">{item.body}</p>
          <div className="bg-cream-50 rounded-xl border border-cream-200 p-5">
            <p className="text-xs font-semibold tracking-widest uppercase text-navy-600 mb-3">What to Look For</p>
            <ul className="space-y-2">
              {item.tips.map((tip) => (
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

      <div className="not-prose rounded-2xl bg-navy-700 text-white p-6 my-8">
        <p className="font-serif text-xl font-semibold mb-2">The Bottom Line</p>
        <p className="text-slate-300 text-sm leading-relaxed">
          Your Home Wise agent specializes in the specific communities where they live and work — not a 50-mile radius.
          Ask us about any neighborhood and we&apos;ll give you the insider perspective that no website can provide:
          what the streets feel like at night, where the new development is going, and which blocks to prioritize.
        </p>
      </div>
    </ArticleLayout>
  );
}
