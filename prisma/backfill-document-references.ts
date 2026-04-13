import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function backfillDrafts() {
  const rows = await prisma.documentDraft.findMany({
    where: { documentId: null },
    select: { id: true, documentPath: true },
  });
  let updated = 0;
  let missing = 0;
  for (const row of rows) {
    const doc = await prisma.document.findFirst({
      where: { storageKey: row.documentPath },
      select: { id: true },
    });
    if (!doc) { missing++; continue; }
    await prisma.documentDraft.update({
      where: { id: row.id },
      data: { documentId: doc.id },
    });
    updated++;
  }
  console.log(`  DocumentDraft:    updated ${updated}, no-match ${missing} (total ${rows.length})`);
}

async function backfillFavorites() {
  const rows = await prisma.documentFavorite.findMany({
    where: { documentId: null },
    select: { id: true, documentPath: true },
  });
  let updated = 0;
  let missing = 0;
  for (const row of rows) {
    const doc = await prisma.document.findFirst({
      where: { storageKey: row.documentPath },
      select: { id: true },
    });
    if (!doc) { missing++; continue; }
    await prisma.documentFavorite.update({
      where: { id: row.id },
      data: { documentId: doc.id },
    });
    updated++;
  }
  console.log(`  DocumentFavorite: updated ${updated}, no-match ${missing} (total ${rows.length})`);
}

async function backfillRecents() {
  const rows = await prisma.documentRecent.findMany({
    where: { documentId: null },
    select: { id: true, documentPath: true },
  });
  let updated = 0;
  let missing = 0;
  for (const row of rows) {
    const doc = await prisma.document.findFirst({
      where: { storageKey: row.documentPath },
      select: { id: true },
    });
    if (!doc) { missing++; continue; }
    await prisma.documentRecent.update({
      where: { id: row.id },
      data: { documentId: doc.id },
    });
    updated++;
  }
  console.log(`  DocumentRecent:   updated ${updated}, no-match ${missing} (total ${rows.length})`);
}

async function main() {
  console.log("Backfilling document references…");
  await backfillDrafts();
  await backfillFavorites();
  await backfillRecents();
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
