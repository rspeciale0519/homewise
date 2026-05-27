import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { prisma } from "@/lib/prisma";
import { JsonLdScript } from "@/components/shared/json-ld-script";

interface PageProps {
  params: Promise<{ slug: string; contentSlug: string }>;
}

async function findContent(categorySlug: string, contentSlug: string) {
  const content = await prisma.trainingContent.findUnique({
    where: { slug: contentSlug },
    include: { categoryRef: true },
  });
  if (!content) return null;
  if (!content.published) return null;
  if (
    content.audience !== "public_only" &&
    content.audience !== "both"
  ) {
    return null;
  }
  if (content.categoryRef?.slug !== categorySlug) {
    return null;
  }
  return content;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, contentSlug } = await params;
  const content = await findContent(slug, contentSlug);
  if (!content) return { title: "Article — Learning Center" };
  return {
    title:
      content.seoTitle ??
      `${content.title} — Learning Center — Homewise FL`,
    description: content.seoDescription ?? content.description ?? undefined,
    alternates: { canonical: `/learn/${slug}/${contentSlug}` },
    openGraph: {
      type: "article",
      title: content.seoTitle ?? content.title,
      description:
        content.seoDescription ?? content.description ?? undefined,
      images: content.ogImageUrl ? [{ url: content.ogImageUrl }] : undefined,
      publishedTime: content.publishedAt?.toISOString(),
    },
  };
}

/** Extract H2/H3 headings from the rendered HTML body to build a TOC. */
function extractToc(html: string): { level: 2 | 3; text: string; id: string }[] {
  const out: { level: 2 | 3; text: string; id: string }[] = [];
  const re = /<h([23])[^>]*>(.*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  const seen = new Map<string, number>();
  while ((match = re.exec(html)) !== null) {
    const level = match[1] === "2" ? 2 : 3;
    const text = match[2]!.replace(/<[^>]+>/g, "").trim();
    if (!text) continue;
    const base = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count}`;
    out.push({ level, text, id });
  }
  return out;
}

/** Rewrite the HTML body to inject id="…" on H2/H3 tags so TOC links land
 *  on the right heading. Same parse order as extractToc to keep ids in
 *  sync. */
function injectHeadingIds(html: string): string {
  const seen = new Map<string, number>();
  return html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_full, levelStr, attrs, inner) => {
      const text = String(inner)
        .replace(/<[^>]+>/g, "")
        .trim();
      if (!text) return `<h${levelStr}${attrs}>${inner}</h${levelStr}>`;
      const base = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count}`;
      if (/\bid=/.test(attrs)) {
        return `<h${levelStr}${attrs}>${inner}</h${levelStr}>`;
      }
      return `<h${levelStr}${attrs} id="${id}">${inner}</h${levelStr}>`;
    },
  );
}

export default async function ContentPage({ params }: PageProps) {
  const { slug, contentSlug } = await params;
  const content = await findContent(slug, contentSlug);
  if (!content) notFound();

  const related = content.categoryRef
    ? await prisma.trainingContent.findMany({
        where: {
          published: true,
          audience: { in: ["public_only", "both"] },
          categoryId: content.categoryRef.id,
          id: { not: content.id },
        },
        orderBy: { publishedAt: "desc" },
        take: 4,
      })
    : [];

  const bodyHtml = content.body ?? "";
  const toc = extractToc(bodyHtml);
  // Sanitize FIRST (DOMPurify), then inject heading ids. Tiptap output is
  // already well-formed but the body could in principle be edited via raw
  // PATCH by an admin, so we treat it as untrusted at render time.
  const sanitizedBody = DOMPurify.sanitize(injectHeadingIds(bodyHtml));

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-xs text-slate-400">
        <Link href="/learn" className="hover:underline">
          Learning Center
        </Link>
        {content.categoryRef && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/learn/${content.categoryRef.slug}`}
              className="hover:underline"
            >
              {content.categoryRef.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-slate-500 truncate">{content.title}</span>
      </nav>

      <header className="mt-3 mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-700 mb-3">
          {content.title}
        </h1>
        {content.description && (
          <p className="text-base text-slate-600">{content.description}</p>
        )}
        <div className="flex items-center gap-3 mt-4 text-xs text-slate-400">
          {content.readTimeMinutes && (
            <span>{content.readTimeMinutes} min read</span>
          )}
          {content.publishedAt && (
            <span>
              {new Date(content.publishedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </header>

      {toc.length >= 3 && (
        <aside
          aria-label="Table of contents"
          className="border-l-2 border-slate-200 pl-4 mb-8"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            On this page
          </p>
          <ul className="space-y-1.5">
            {toc.map((h) => (
              <li
                key={h.id}
                className={h.level === 3 ? "pl-3" : ""}
              >
                <a
                  href={`#${h.id}`}
                  className="text-sm text-slate-600 hover:text-navy-700 hover:underline"
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <article
        className="prose prose-slate max-w-none prose-headings:font-serif prose-headings:text-navy-700 prose-a:text-navy-600"
        dangerouslySetInnerHTML={{ __html: sanitizedBody }}
      />

      {related.length > 0 && content.categoryRef && (
        <section className="mt-12 pt-8 border-t border-slate-200">
          <h2 className="font-serif text-xl font-semibold text-navy-700 mb-5">
            Related in {content.categoryRef.name}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={
                  r.slug && content.categoryRef
                    ? `/learn/${content.categoryRef.slug}/${r.slug}`
                    : "#"
                }
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
              >
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  {r.type}
                </p>
                <h3 className="text-sm font-semibold text-navy-700">
                  {r.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: content.title,
          description:
            content.seoDescription ?? content.description ?? undefined,
          image: content.ogImageUrl ?? content.thumbnailUrl ?? undefined,
          datePublished: content.publishedAt?.toISOString(),
          dateModified: content.updatedAt.toISOString(),
          publisher: {
            "@type": "Organization",
            name: "Homewise FL",
          },
        }}
      />
    </div>
  );
}
