import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [catCount, secCount, content, items, courses] = await Promise.all([
    prisma.trainingCategory.count(),
    prisma.trainingSection.count(),
    prisma.trainingContent.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        categoryId: true,
        audience: true,
        status: true,
        publishedAt: true,
        published: true,
      },
      take: 5,
    }),
    prisma.trainingCourseItem.findMany({
      select: { id: true, courseId: true, sectionId: true, contentId: true },
      take: 5,
    }),
    prisma.trainingCourse.findMany({
      select: { id: true, name: true, slug: true, audience: true, passThreshold: true },
      take: 5,
    }),
  ]);
  console.log("Categories:", catCount);
  console.log("Sections:", secCount);
  console.log("Content sample:", JSON.stringify(content, null, 2));
  console.log("Items sample:", JSON.stringify(items, null, 2));
  console.log("Courses sample:", JSON.stringify(courses, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
