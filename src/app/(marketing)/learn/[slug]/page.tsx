import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/ui/back-button";
import { JsonLdScript } from "@/components/shared/json-ld-script";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

async function findCategory(slug: string) {
  return prisma.trainingCategory.findUnique({
    where: { slug },
    include: {
      content: {
        where: {
          published: true,
          audience: { in: ["public_only", "both"] },
        },
        orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
      },
    },
  });
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cat = await findCategory(slug);
  if (!cat) return { title: "Topic — Learning Center" };
  return {
    title: `${cat.name} — Learning Center — Homewise FL`,
    description:
      cat.description ??
      `Articles, guides, and videos about ${cat.name.toLowerCase()} in Central Florida real estate.`,
    alternates: { canonical: `/learn/${cat.slug}` },
    openGraph: {
      title: `${cat.name} — Learning Center`,
      description: cat.description ?? undefined,
      images: cat.heroImageUrl ? [{ url: cat.heroImageUrl }] : undefined,
    },
  };
}

export default async function LearnCategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const cat = await findCategory(slug);

  if (!cat) {
    // Legacy fallback — keep matching content for hardcoded "buying" /
    // "selling" slugs that pre-date the TrainingCategory entity.
    const legacy = await prisma.trainingContent.findMany({
      where: {
        published: true,
        audience: { in: ["public_only", "both"] },
        category: { contains: slug, mode: "insensitive" },
      },
      orderBy: { sortOrder: "asc" },
    });
    if (legacy.length === 0) notFound();
    return (
      <LegacyCategoryView title={slug.replace(/-/g, " ")} items={legacy} />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <BackButton
        fallbackHref="/learn"
        label="Back to Learning Center"
      />

      <nav aria-label="Breadcrumb" className="mt-4 text-xs text-slate-400">
        <Link href="/learn" className="hover:underline">
          Learning Center
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-500">{cat.name}</span>
      </nav>

      <h1 className="font-serif text-3xl font-bold text-navy-700 mt-2 mb-2">
        {cat.name}
      </h1>
      {cat.description && (
        <p className="text-slate-500 mb-8">{cat.description}</p>
      )}

      {cat.content.length === 0 ? (
        <p className="text-slate-400 py-12 text-center">
          No articles in this topic yet.
        </p>
      ) : (
        <div className="space-y-3">
          {cat.content.map((item) => (
            <Link
              key={item.id}
              href={item.slug ? `/learn/${cat.slug}/${item.slug}` : "#"}
              className="block bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  {item.type}
                </span>
                {item.readTimeMinutes && (
                  <>
                    <span className="text-[10px] text-slate-300">·</span>
                    <span className="text-[10px] text-slate-400">
                      {item.readTimeMinutes} min read
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-base font-semibold text-navy-700">
                {item.title}
              </h2>
              {item.description && (
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: cat.name,
          description: cat.description ?? undefined,
          url: `/learn/${cat.slug}`,
          hasPart: cat.content.map((c) => ({
            "@type": "Article",
            headline: c.title,
            url: c.slug ? `/learn/${cat.slug}/${c.slug}` : undefined,
            datePublished: c.publishedAt?.toISOString(),
          })),
        }}
      />
    </div>
  );
}

interface LegacyItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  duration: number | null;
  url: string | null;
}

function LegacyCategoryView({
  title,
  items,
}: {
  title: string;
  items: LegacyItem[];
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <BackButton fallbackHref="/learn" label="Back to Learning Center" />
      <h1 className="font-serif text-3xl font-bold text-navy-700 mt-4 mb-2 capitalize">
        {title}
      </h1>
      <div className="space-y-4 mt-6">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 p-5"
          >
            <div className="flex items-start gap-4">
              <span className="h-8 w-8 rounded-full bg-navy-50 text-navy-600 flex items-center justify-center text-sm font-semibold shrink-0">
                {i + 1}
              </span>
              <div className="flex-1">
                <h2 className="font-semibold text-navy-700">{item.title}</h2>
                {item.description && (
                  <p className="text-sm text-slate-500 mt-1">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-slate-400 capitalize">
                    {item.type}
                  </span>
                  {item.duration && (
                    <span className="text-xs text-slate-400">
                      {item.duration} min
                    </span>
                  )}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-navy-600 font-medium hover:underline"
                    >
                      {item.type === "video"
                        ? "Watch Video"
                        : "View Resource"}{" "}
                      →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
