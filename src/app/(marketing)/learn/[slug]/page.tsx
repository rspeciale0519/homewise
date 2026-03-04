import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

interface LessonPageProps {
  params: Promise<{ slug: string }>;
}

const COURSE_TITLES: Record<string, string> = {
  buying: "Buying 101",
  selling: "Selling 101",
};

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { slug } = await params;
  const title = COURSE_TITLES[slug] ?? slug;
  return { title: `${title} — Learning Center — Homewise FL` };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug } = await params;
  const courseTitle = COURSE_TITLES[slug] ?? slug;

  const content = await prisma.trainingContent.findMany({
    where: {
      published: true,
      audience: { in: ["public", "both"] },
      category: { contains: slug, mode: "insensitive" },
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/learn" className="text-sm text-slate-500 hover:text-navy-700 transition-colors">
        ← Back to Learning Center
      </Link>

      <h1 className="font-serif text-3xl font-bold text-navy-700 mt-4 mb-2">{courseTitle}</h1>
      <p className="text-slate-500 mb-8">
        {slug === "buying" ? "A step-by-step guide to buying your first home in Florida." : "Everything you need to know about selling your home for the best price."}
      </p>

      <div className="space-y-4">
        {content.map((item, i) => (
          <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start gap-4">
              <span className="h-8 w-8 rounded-full bg-navy-50 text-navy-600 flex items-center justify-center text-sm font-semibold shrink-0">
                {i + 1}
              </span>
              <div className="flex-1">
                <h2 className="font-semibold text-navy-700">{item.title}</h2>
                {item.description && <p className="text-sm text-slate-500 mt-1">{item.description}</p>}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-slate-400 capitalize">{item.type}</span>
                  {item.duration && <span className="text-xs text-slate-400">{item.duration} min</span>}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-navy-600 font-medium hover:underline">
                      {item.type === "video" ? "Watch Video" : "View Resource"} →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {content.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-500">Course content is being prepared. Check back soon!</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-10 bg-navy-50 rounded-xl p-6 text-center">
        <h3 className="font-serif text-lg font-bold text-navy-700 mb-2">Have questions?</h3>
        <p className="text-sm text-slate-600 mb-4">Our agents are here to guide you through every step.</p>
        <a href="/contact" className="inline-block px-6 py-3 bg-navy-600 text-white font-semibold rounded-xl hover:bg-navy-700 transition-colors">
          Contact an Agent
        </a>
      </div>
    </div>
  );
}
