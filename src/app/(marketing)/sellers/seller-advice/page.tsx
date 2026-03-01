import type { Metadata } from "next";
import { ArticleLayout } from "@/components/content/article-layout";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Seller Advice from Our Experts",
  description: "Expert selling advice from Home Wise Realty Group's top Central Florida agents.",
  path: "/sellers/seller-advice",
});

const TIPS = [
  {
    icon: "📊",
    title: "Trust the Data, Not Your Attachment",
    body: "Every seller loves their home — and most believe it's worth more than the market says. This is normal, but it can cost you. Buyers don't pay for your memories. They pay for comparable value. Trust your agent's CMA and price accordingly.",
  },
  {
    icon: "📅",
    title: "Timing the Market Is Real",
    body: "Central Florida's real estate market has seasonal patterns. Spring (February through May) typically sees the highest buyer activity and strongest prices. If you have flexibility, listing in peak season can meaningfully improve your outcome.",
  },
  {
    icon: "🤝",
    title: "First Offers Are Often Best",
    body: "Many sellers dismiss early offers hoping for something better. In reality, the buyers most motivated to purchase act quickly. The first offer — especially in the first two weeks — often reflects true market value. Don't let it expire without serious consideration.",
  },
  {
    icon: "🏠",
    title: "Be Flexible on Showings",
    body: "Every showing turned away is a potential offer lost. Make your home as accessible as possible, especially in the first 30 days. The more buyers through the door, the more competition — and the better your eventual offer.",
  },
  {
    icon: "📋",
    title: "Disclosures Are Your Friend",
    body: "Florida law requires disclosure of known material defects. Being transparent upfront — about the roof age, past water intrusion, or HOA disputes — builds trust and prevents deals from falling apart during due diligence.",
  },
  {
    icon: "💡",
    title: "Don't Over-Improve Before Listing",
    body: "Not every renovation adds dollar-for-dollar value. Kitchen remodels, additions, and luxury upgrades in a mid-range neighborhood often don't pay off at sale. Focus on condition (repairs, paint, staging) rather than taste-based improvements.",
  },
];

const RELATED = [
  { label: "Home Staging Tips", href: "/sellers/staging" },
  { label: "Sell Your Home Fast", href: "/sellers/sell-fast" },
  { label: "Sounds & Smells", href: "/sellers/sounds-and-smells" },
  { label: "Free Home Evaluation", href: "/home-evaluation" },
];

export default function SellerAdvicePage() {
  return (
    <ArticleLayout
      eyebrow="For Sellers"
      title="Seller Advice from Our Experts"
      subtitle="After thousands of Central Florida transactions, our agents have identified the decisions that separate a great sale from a stressful one."
      breadcrumbs={[{ label: "For Sellers", href: "/sellers" }, { label: "Seller Advice" }]}
      relatedLinks={RELATED}
      ctaTitle="Work With a Top Agent"
      ctaHref="/agents"
      ctaLabel="Find Your Agent"
    >
      <p>
        Selling a home is one of the most significant financial transactions you&apos;ll make. The advice below comes
        directly from our highest-performing agents — insights earned through years of real-world negotiations and
        thousands of closed transactions across Central Florida.
      </p>

      <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-5 my-8">
        {TIPS.map((tip) => (
          <div key={tip.title} className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 hover:shadow-elevated transition-shadow duration-300">
            <div className="text-3xl mb-3">{tip.icon}</div>
            <h3 className="font-serif text-lg font-semibold text-navy-700 mb-2">{tip.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{tip.body}</p>
          </div>
        ))}
      </div>

      <div className="not-prose rounded-2xl bg-crimson-600 text-white p-7 my-6">
        <p className="font-serif text-2xl font-semibold mb-3">
          &ldquo;The best time to call your agent is before you&apos;re ready to list.&rdquo;
        </p>
        <p className="text-crimson-100 leading-relaxed">
          Many of the most successful sales start with a conversation 60–90 days before listing. That time allows
          for strategic repairs, optimal timing, and a marketing plan — instead of rushing to market unprepared.
          Call us anytime.
        </p>
      </div>
    </ArticleLayout>
  );
}
