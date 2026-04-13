import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/slug/slugify";

const prisma = new PrismaClient();

async function uniqueSlug(base: string, taken: Set<string>): Promise<string> {
  const seed = slugify(base) || "module";
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

async function main() {
  const rows = await prisma.trainingContent.findMany({
    select: { id: true, title: true, slug: true },
    orderBy: { createdAt: "asc" },
  });

  const taken = new Set<string>(
    rows.filter((r) => r.slug).map((r) => r.slug as string),
  );

  let updated = 0;
  for (const row of rows) {
    if (row.slug) continue;
    const slug = await uniqueSlug(row.title, taken);
    await prisma.trainingContent.update({
      where: { id: row.id },
      data: { slug },
    });
    updated++;
    console.log(`  ${row.title}  →  ${slug}`);
  }

  console.log(`\nBackfilled ${updated} training content rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
