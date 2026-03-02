import { PrismaClient } from "@prisma/client";
import { MOCK_AGENTS } from "../archive/data-mock-agents";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding agents...");

  for (const agent of MOCK_AGENTS) {
    await prisma.agent.upsert({
      where: { slug: agent.slug },
      update: {
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        phone: agent.phone,
        photoUrl: agent.photoUrl,
        languages: agent.languages,
        designations: agent.designations,
        bio: agent.bio,
        active: agent.active,
      },
      create: {
        firstName: agent.firstName,
        lastName: agent.lastName,
        slug: agent.slug,
        email: agent.email,
        phone: agent.phone,
        photoUrl: agent.photoUrl,
        languages: agent.languages,
        designations: agent.designations,
        bio: agent.bio,
        active: agent.active,
      },
    });
    console.log(`  Upserted: ${agent.firstName} ${agent.lastName}`);
  }

  console.log(`Seeded ${MOCK_AGENTS.length} agents.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
