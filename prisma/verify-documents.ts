import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [docs, cats, memberships, slugHistory] = await Promise.all([
    prisma.document.count(),
    prisma.documentCategory.count(),
    prisma.documentCategoryMembership.count(),
    prisma.slugHistory.count({ where: { entityType: "document" } }),
  ]);

  const [drafts, favorites, recents] = await Promise.all([
    prisma.documentDraft.findMany({
      select: { documentId: true, documentPath: true },
    }),
    prisma.documentFavorite.findMany({
      select: { documentId: true, documentPath: true },
    }),
    prisma.documentRecent.findMany({
      select: { documentId: true, documentPath: true },
    }),
  ]);

  console.log("Documents:      ", docs);
  console.log("Categories:     ", cats);
  console.log("Memberships:    ", memberships);
  console.log("Slug history:   ", slugHistory, "(document renames)");
  console.log();
  console.log("DocumentDraft rows:", drafts.length);
  console.log("  with documentId set:", drafts.filter((d) => d.documentId).length);
  console.log("  without (legacy):    ", drafts.filter((d) => !d.documentId).length);
  console.log("DocumentFavorite rows:", favorites.length);
  console.log("  with documentId set:", favorites.filter((d) => d.documentId).length);
  console.log("  without (legacy):    ", favorites.filter((d) => !d.documentId).length);
  console.log("DocumentRecent rows:  ", recents.length);
  console.log("  with documentId set:", recents.filter((d) => d.documentId).length);
  console.log("  without (legacy):    ", recents.filter((d) => !d.documentId).length);

  const unmatchedPaths = new Set<string>();
  for (const row of [...drafts, ...favorites, ...recents]) {
    if (!row.documentId) unmatchedPaths.add(row.documentPath);
  }
  if (unmatchedPaths.size > 0) {
    console.log();
    console.log("Unmatched documentPaths (no Document.storageKey match):");
    for (const p of unmatchedPaths) console.log("  -", p);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
