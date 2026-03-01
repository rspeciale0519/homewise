import type { Metadata } from "next";
import { ArticleLayout } from "@/components/content/article-layout";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Sounds & Smells: What Buyers Notice",
  description: "The sensory details buyers notice during showings — and how to ensure they work in your favor.",
  path: "/sellers/sounds-and-smells",
});

const SOUNDS = [
  { issue: "Squeaking floors or stairs", fix: "Apply powdered graphite or lumber soap between boards. Major squeaks may need a contractor." },
  { issue: "Dripping faucets", fix: "Replace washers or cartridges. A $10 fix that prevents thousands in negotiated deductions." },
  { issue: "Rattling HVAC vents", fix: "Check for loose screws, debris, or an undersized filter creating excess airflow pressure." },
  { issue: "Noisy appliances", fix: "Service or replace appliances that make unusual sounds — buyers will notice and wonder what else is wrong." },
  { issue: "Loud neighborhood noise", fix: "Schedule showings when noise is minimal. For ongoing noise, consider window inserts or mention soundproofing features." },
  { issue: "Garage door noise", fix: "Lubricate springs, hinges, and rollers. A quiet, smooth garage door signals a well-maintained home." },
];

const SMELLS = [
  { issue: "Pet odors", fix: "Steam clean all carpets and upholstery. Clean HVAC vents and replace filters. Ozone treatment for stubborn odors. Be honest with yourself — ask a trusted friend." },
  { issue: "Musty or mildew smell", fix: "Identify moisture sources first. Run dehumidifiers, check for leaks, ensure attic ventilation is adequate. Air out the home daily." },
  { issue: "Cooking odors", fix: "Deep clean the oven, hood, and cabinet interiors. Run the exhaust fan. Avoid cooking strong-smelling foods during the listing period." },
  { issue: "Cigarette smoke", fix: "This is one of the hardest to eliminate. May require repainting all surfaces, replacing carpet, and cleaning ductwork professionally." },
  { issue: "Chemical or cleaning product smell", fix: "Don't overdo cleaning products before showings. A strong bleach or chemical smell signals that something was being masked." },
  { issue: "Stale, closed-up air", fix: "Air the home daily when possible. Use a HEPA air purifier. Light, natural scents (citrus, cedar) from essential oil diffusers are subtle and pleasant." },
];

const RELATED = [
  { label: "Home Staging Tips", href: "/sellers/staging" },
  { label: "Sell Your Home Fast", href: "/sellers/sell-fast" },
  { label: "Seller Advice", href: "/sellers/seller-advice" },
];

export default function SoundsSmellsPage() {
  return (
    <ArticleLayout
      eyebrow="For Sellers"
      title="Sounds & Smells Matter"
      subtitle="Buyers process your home with all five senses. Here's what they're noticing — and how to make sure every sensory impression works in your favor."
      breadcrumbs={[{ label: "For Sellers", href: "/sellers" }, { label: "Sounds & Smells" }]}
      relatedLinks={RELATED}
    >
      <p>
        Most sellers focus entirely on how their home <em>looks</em>. But experienced buyers — and their agents —
        are trained to notice sounds and smells that can signal underlying problems or simply create negative impressions.
        Address these before your first showing.
      </p>

      <h2>Sounds to Investigate</h2>
      <p>Walk through your home slowly and listen. Open and close every door, window, cabinet, and appliance. Turn on the HVAC and water. Here&apos;s what to address:</p>

      <div className="not-prose space-y-4 my-6">
        {SOUNDS.map((item) => (
          <div key={item.issue} className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 110 14 7 7 0 010-14z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-navy-700 text-sm mb-1">{item.issue}</p>
                <p className="text-slate-500 text-sm leading-relaxed">{item.fix}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2>Smells to Eliminate</h2>
      <p>
        Bad smells kill deals. Buyers who detect an odor immediately begin wondering what structural problem it might indicate — even if it&apos;s simply a cooking habit.
        Never use heavy air fresheners to mask odors. Eliminate them at the source.
      </p>

      <div className="not-prose space-y-4 my-6">
        {SMELLS.map((item) => (
          <div key={item.issue} className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-crimson-50 text-crimson-600 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-navy-700 text-sm mb-1">{item.issue}</p>
                <p className="text-slate-500 text-sm leading-relaxed">{item.fix}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="not-prose rounded-2xl bg-navy-700 text-white p-6 my-6">
        <p className="font-serif text-xl font-semibold mb-2">The Golden Rule</p>
        <p className="text-slate-300 leading-relaxed">
          Walk through your home as if you&apos;ve never been inside it. Better yet — ask a friend who doesn&apos;t visit often
          to give you brutally honest feedback. Your Home Wise agent will do the same during your pre-listing walkthrough.
        </p>
      </div>
    </ArticleLayout>
  );
}
