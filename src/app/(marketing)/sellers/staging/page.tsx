import type { Metadata } from "next";
import { ArticleLayout } from "@/components/content/article-layout";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Home Staging Tips",
  description: "Ten proven home staging tips to help your Central Florida home sell faster and for more money.",
  path: "/sellers/staging",
});

const STAGING_STEPS = [
  {
    title: "Declutter Every Room",
    body: "Buyers need to envision themselves living in your home — not wade through your belongings. Remove at least one-third of furniture and personal items from every room. Clear countertops, closets, and storage spaces. Less is always more.",
  },
  {
    title: "Deep Clean from Top to Bottom",
    body: "A spotless home signals to buyers that the property has been well-maintained. Hire professional cleaners if needed. Pay special attention to kitchens and bathrooms, grout lines, baseboards, ceiling fans, and windows.",
  },
  {
    title: "Paint with Neutral Colors",
    body: "Fresh, neutral paint is one of the highest-ROI investments before listing. Opt for warm whites, soft grays, or greige tones. Buyers can mentally add their own personality more easily to a neutral canvas.",
  },
  {
    title: "Maximize Natural Light",
    body: "Open all blinds and curtains before every showing. Clean windows inside and out. Replace dim bulbs with bright, warm-white LEDs. Well-lit homes photograph better and feel more welcoming.",
  },
  {
    title: "Enhance Curb Appeal",
    body: "You never get a second chance at a first impression. Mow and edge the lawn, plant fresh flowers, pressure-wash the driveway and walkways, repaint the front door, and replace worn house numbers.",
  },
  {
    title: "Arrange Furniture Purposefully",
    body: "Create natural conversation areas that help buyers understand how to use each space. Pull furniture away from walls. Remove anything that blocks natural pathways. If a room feels small, consider removing a piece of furniture.",
  },
  {
    title: "Stage the Kitchen to Sell",
    body: "The kitchen sells the house. Clear all countertops except for one or two attractive items. Update cabinet hardware if dated. Add a bowl of fresh fruit or a vase of flowers for warmth. Make sure appliances sparkle.",
  },
  {
    title: "Make Bathrooms Feel Like a Spa",
    body: "Roll fresh white towels, add a small plant or candle, install new toilet seats if worn, re-caulk tubs and showers if needed, and replace dated shower curtains. Small upgrades create a big perception shift.",
  },
  {
    title: "Create Lifestyle Vignettes",
    body: "Help buyers picture their life in the home. A book and reading lamp in a corner. A chess set on a coffee table. Coordinated throw pillows and a soft blanket on the bed. These details add warmth without clutter.",
  },
  {
    title: "Address Odors Before Showings",
    body: "Never mask odors with heavy air fresheners — buyers will notice and wonder what you're hiding. Identify and eliminate sources: pet odors, cooking smells, musty areas. A clean-smelling home instills confidence.",
  },
];

const RELATED = [
  { label: "Sell Your Home Fast", href: "/sellers/sell-fast" },
  { label: "Sounds & Smells", href: "/sellers/sounds-and-smells" },
  { label: "Seller Advice", href: "/sellers/seller-advice" },
  { label: "Free Home Evaluation", href: "/home-evaluation" },
];

export default function StagingPage() {
  return (
    <ArticleLayout
      eyebrow="For Sellers"
      title="Home Staging Tips"
      subtitle="Strategic staging can add thousands to your sale price and weeks off your market time. Here's exactly what to do."
      breadcrumbs={[{ label: "For Sellers", href: "/sellers" }, { label: "Staging Tips" }]}
      relatedLinks={RELATED}
      ctaTitle="Ready to List Your Home?"
      ctaHref="/home-evaluation"
      ctaLabel="Get Free Evaluation"
    >
      <p>
        Staged homes sell for <strong>6–10% more</strong> and spend significantly less time on the market than unstaged properties.
        The investment in staging — whether DIY or professional — consistently delivers the highest return of any pre-listing activity.
        Follow these ten steps before your first showing.
      </p>

      <hr />

      {STAGING_STEPS.map((step, i) => (
        <div key={step.title} className="not-prose flex gap-5 mb-8">
          <div className="shrink-0 h-10 w-10 rounded-full bg-navy-700 text-white font-serif font-bold text-lg flex items-center justify-center">
            {i + 1}
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold text-navy-700 mb-1.5">{step.title}</h3>
            <p className="text-slate-600 leading-relaxed text-base">{step.body}</p>
          </div>
        </div>
      ))}

      <hr />

      <div className="not-prose rounded-2xl bg-crimson-50 border border-crimson-100 p-6 my-6">
        <p className="text-xs font-semibold tracking-widest uppercase text-crimson-600 mb-2">Pro Tip</p>
        <p className="text-slate-700 font-medium leading-relaxed">
          Ask your Home Wise agent for a complimentary pre-listing walkthrough. Our agents will identify the highest-impact
          changes specific to your home and your neighborhood&apos;s buyer expectations — before you spend a dollar.
        </p>
      </div>
    </ArticleLayout>
  );
}
