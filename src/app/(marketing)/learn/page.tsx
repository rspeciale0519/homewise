import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Learning Center — Homewise FL",
  description:
    "Free guides, videos, and resources for home buyers and sellers in Central Florida.",
  alternates: { canonical: "/learn" },
};

export default async function LearnPage() {
  // Categories with at least one published public content piece. Sorted by
  // explicit sortOrder so the brokerage admin controls reading order, then
  // alphabetically as a stable fallback.
  const categories = await prisma.trainingCategory.findMany({
    where: {
      content: {
        some: {
          published: true,
          audience: { in: ["public_only", "both"] },
        },
      },
    },
    include: {
      _count: {
        select: {
          content: {
            where: {
              published: true,
              audience: { in: ["public_only", "both"] },
            },
          },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  // A small set of featured pieces below the category grid. Most-recently-
  // published wins for the public surface — that's the "freshness" signal
  // search engines reward.
  const featured = await prisma.trainingContent.findMany({
    where: {
      published: true,
      audience: { in: ["public_only", "both"] },
    },
    orderBy: { publishedAt: "desc" },
    take: 6,
    include: { categoryRef: true },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-700 mb-3">
          Learning Center
        </h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Free guides, videos, and resources to help you navigate the real
          estate process with confidence.
        </p>
      </div>

      {categories.length > 0 && (
        <section className="mb-12">
          <h2 className="font-serif text-xl font-semibold text-navy-700 mb-5">
            Browse by topic
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/learn/${cat.slug}`}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all"
              >
                <h3 className="font-serif text-lg font-bold text-navy-700">
                  {cat.name}
                </h3>
                {cat.description && (
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                    {cat.description}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-3">
                  {cat._count.content}{" "}
                  {cat._count.content === 1 ? "article" : "articles"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section>
          <h2 className="font-serif text-xl font-semibold text-navy-700 mb-5">
            Latest
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((item) => (
              <Link
                key={item.id}
                href={
                  item.categoryRef && item.slug
                    ? `/learn/${item.categoryRef.slug}/${item.slug}`
                    : item.slug
                      ? `/learn/${item.category}/${item.slug}`
                      : `/learn/${item.category}`
                }
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    {item.categoryRef?.name ?? item.category}
                  </span>
                  <span className="text-[10px] text-slate-300">·</span>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {item.type}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-navy-700 mb-1">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {categories.length === 0 && featured.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500">Learning content coming soon!</p>
        </div>
      )}
    </div>
  );
}
