import { PrismaClient } from "@prisma/client";
import {
  OFFICE_FORMS,
  LISTING_FORMS,
  SALES_FORMS,
  QUICK_ACCESS_DOCUMENTS,
  type SeedResourceCategory,
  type SeedResourceDocument,
} from "./seed-data-documents";
import { slugify } from "../src/lib/slug/slugify";

const prisma = new PrismaClient();

type Section = "office" | "listing" | "sales";

const SECTIONS: Array<{ section: Section; categories: SeedResourceCategory[] }> = [
  { section: "office", categories: OFFICE_FORMS },
  { section: "listing", categories: LISTING_FORMS },
  { section: "sales", categories: SALES_FORMS },
];

function uniqueInSet(base: string, taken: Set<string>): string {
  const seed = slugify(base) || "item";
  if (!taken.has(seed)) {
    taken.add(seed);
    return seed;
  }
  let i = 2;
  while (taken.has(`${seed}-${i}`)) i++;
  const candidate = `${seed}-${i}`;
  taken.add(candidate);
  return candidate;
}

function inferStorage(doc: SeedResourceDocument): {
  external: boolean;
  url?: string;
  storageKey?: string;
  storageProvider: string;
} {
  if (doc.external || doc.url.startsWith("http")) {
    return { external: true, url: doc.url, storageProvider: "local" };
  }
  const prefix = "/api/documents/";
  const key = doc.url.startsWith(prefix) ? doc.url.slice(prefix.length) : doc.url;
  return { external: false, storageKey: key, storageProvider: "local" };
}

async function seedDocuments() {
  console.log("Seeding documents and categories…");

  const existingCategories = await prisma.documentCategory.findMany({
    select: { slug: true },
  });
  const takenCategorySlugs = new Set(existingCategories.map((c) => c.slug));

  const existingDocs = await prisma.document.findMany({
    select: { slug: true, storageKey: true, url: true },
  });
  const takenDocSlugs = new Set(existingDocs.map((d) => d.slug));
  const docByKey = new Map<string, string>();
  for (const d of existingDocs) {
    const key = d.storageKey ?? d.url;
    if (key) docByKey.set(key, d.slug);
  }

  const quickAccessKeys = new Set<string>();
  for (const q of QUICK_ACCESS_DOCUMENTS) {
    const { storageKey, url } = inferStorage(q);
    quickAccessKeys.add(storageKey ?? url ?? q.url);
  }

  let categoryCount = 0;
  let documentCount = 0;
  let membershipCount = 0;

  for (const { section, categories } of SECTIONS) {
    for (let ci = 0; ci < categories.length; ci++) {
      const rc = categories[ci];
      const catSlug = uniqueInSet(`${section}-${rc.title}`, takenCategorySlugs);
      const category = await prisma.documentCategory.upsert({
        where: { slug: catSlug },
        update: { title: rc.title, section, sortOrder: ci },
        create: {
          slug: catSlug,
          title: rc.title,
          section,
          sortOrder: ci,
        },
      });
      categoryCount++;

      for (let di = 0; di < rc.documents.length; di++) {
        const doc = rc.documents[di];
        const storage = inferStorage(doc);
        const dedupKey = storage.storageKey ?? storage.url ?? doc.url;
        let docSlug = docByKey.get(dedupKey);

        if (!docSlug) {
          docSlug = uniqueInSet(doc.name, takenDocSlugs);
          docByKey.set(dedupKey, docSlug);
          await prisma.document.create({
            data: {
              slug: docSlug,
              name: doc.name,
              description: doc.description,
              external: storage.external,
              url: storage.url,
              storageKey: storage.storageKey,
              storageProvider: storage.storageProvider,
              quickAccess: quickAccessKeys.has(dedupKey),
              sortOrder: di,
            },
          });
          documentCount++;
        }

        const document = await prisma.document.findUnique({
          where: { slug: docSlug },
          select: { id: true },
        });
        if (!document) continue;

        const existingMembership = await prisma.documentCategoryMembership.findUnique({
          where: {
            documentId_categoryId: {
              documentId: document.id,
              categoryId: category.id,
            },
          },
        });
        if (!existingMembership) {
          await prisma.documentCategoryMembership.create({
            data: {
              documentId: document.id,
              categoryId: category.id,
              sortOrder: di,
            },
          });
          membershipCount++;
        }
      }
    }
  }

  console.log(
    `  ✓ ${categoryCount} categories, ${documentCount} documents, ${membershipCount} memberships`,
  );
}

async function main() {
  await seedDocuments();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
