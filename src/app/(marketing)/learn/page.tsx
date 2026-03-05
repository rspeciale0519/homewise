import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Learning Center — Homewise FL",
  description: "Free guides, videos, and resources for home buyers and sellers in Central Florida",
};

export default async function LearnPage() {
  const content = await prisma.trainingContent.findMany({
    where: { published: true, audience: { in: ["public", "both"] } },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const grouped = content.reduce<Record<string, typeof content>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(item);
    return acc;
  }, {});

  const courses = [
    { title: "Buying 101", slug: "buying", description: "Everything you need to know about buying a home in Florida", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { title: "Selling 101", slug: "selling", description: "Guide to selling your home for the best price", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-700 mb-3">Learning Center</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">Free guides, videos, and resources to help you navigate the real estate process with confidence.</p>
      </div>

      {/* Guided Courses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {courses.map((course) => (
          <Link
            key={course.slug}
            href={`/learn/${course.slug}`}
            className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="h-12 w-12 bg-navy-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-navy-100 transition-colors">
              <svg className="h-6 w-6 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={course.icon} />
              </svg>
            </div>
            <h2 className="font-serif text-xl font-bold text-navy-700 mb-1">{course.title}</h2>
            <p className="text-sm text-slate-500">{course.description}</p>
          </Link>
        ))}
      </div>

      {/* Content Library */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="mb-8">
          <h2 className="text-lg font-semibold text-navy-700 mb-4 capitalize">{category.replace("_", " ")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === "video" ? "bg-crimson-100 text-crimson-600" :
                    item.type === "document" ? "bg-blue-100 text-blue-600" :
                    "bg-navy-100 text-navy-600"
                  }`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {item.type === "video" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      )}
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-navy-700">{item.title}</h3>
                    {item.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-400 capitalize">{item.type}</span>
                      {item.duration && <span className="text-xs text-slate-400">{item.duration} min</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {content.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500">Learning content coming soon!</p>
        </div>
      )}
    </div>
  );
}
