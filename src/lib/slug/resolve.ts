import { prisma } from "@/lib/prisma";

export type SlugEntity = "training" | "document";

export interface SlugLookup<T> {
  record: T;
  redirectFrom?: string;
}

export async function isSlugTakenForTraining(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const [current, history] = await Promise.all([
    prisma.trainingContent.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    }),
    prisma.slugHistory.findFirst({
      where: {
        entityType: "training",
        oldSlug: slug,
        ...(excludeId ? { NOT: { entityId: excludeId } } : {}),
      },
      select: { id: true },
    }),
  ]);
  return Boolean(current || history);
}

export async function resolveTrainingSlug(slug: string): Promise<
  SlugLookup<{
    id: string;
    slug: string | null;
  }> | null
> {
  const current = await prisma.trainingContent.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });
  if (current) return { record: current };

  const history = await prisma.slugHistory.findUnique({
    where: { entityType_oldSlug: { entityType: "training", oldSlug: slug } },
  });
  if (!history) return null;

  const target = await prisma.trainingContent.findUnique({
    where: { id: history.entityId },
    select: { id: true, slug: true },
  });
  if (!target) return null;

  return { record: target, redirectFrom: slug };
}

export async function recordTrainingSlugChange(
  entityId: string,
  oldSlug: string,
): Promise<void> {
  if (!oldSlug) return;
  await prisma.slugHistory.upsert({
    where: {
      entityType_oldSlug: { entityType: "training", oldSlug },
    },
    update: { entityId },
    create: { entityType: "training", entityId, oldSlug },
  });
}
