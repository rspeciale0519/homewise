import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const drafts = await prisma.$queryRaw<
    Array<{ id: string; status: string; createdAt: Date; listRowCount: number }>
  >`
    SELECT id, status, "createdAt", "listRowCount"
    FROM "MailOrder"
  `;

  if (drafts.length === 0) {
    console.log("No drafts with listRowCount > 0 to clean up.");
    return;
  }

  console.log(`Found ${drafts.length} order(s) with legacy listRowCount > 0:`);
  drafts.forEach((d) => {
    console.log(`  - ${d.id} (${d.status}, created ${d.createdAt.toISOString()})`);
  });

  const ids = drafts.map((d) => d.id);
  const result = await prisma.mailOrder.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted ${result.count} order(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
