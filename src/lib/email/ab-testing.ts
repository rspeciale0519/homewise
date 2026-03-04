import { prisma } from "@/lib/prisma";

export async function generateSubjectVariants(
  campaignEmailId: string,
  baseSubject: string,
): Promise<void> {
  const variations = generateVariations(baseSubject);

  for (let i = 0; i < variations.length; i++) {
    const subject = variations[i]!;
    await prisma.subjectLineVariant.upsert({
      where: {
        campaignEmailId_variant: { campaignEmailId, variant: String.fromCharCode(65 + i) },
      },
      create: {
        campaignEmailId,
        variant: String.fromCharCode(65 + i),
        subject,
      },
      update: { subject },
    });
  }
}

export async function pickVariant(campaignEmailId: string): Promise<{
  variant: string;
  subject: string;
} | null> {
  const variants = await prisma.subjectLineVariant.findMany({
    where: { campaignEmailId },
    orderBy: { variant: "asc" },
  });

  if (variants.length === 0) return null;

  // Random assignment for fair distribution
  const idx = Math.floor(Math.random() * variants.length);
  const selected = variants[idx]!;

  await prisma.subjectLineVariant.update({
    where: { id: selected.id },
    data: { sendCount: { increment: 1 } },
  });

  return { variant: selected.variant, subject: selected.subject };
}

export async function getVariantStats(campaignEmailId: string) {
  return prisma.subjectLineVariant.findMany({
    where: { campaignEmailId },
    orderBy: { variant: "asc" },
  });
}

function generateVariations(baseSubject: string): string[] {
  // Placeholder: in Phase 4 this will use AI to generate variations
  // For now, create simple programmatic variations
  const variations: string[] = [baseSubject];

  // Variation B: Add urgency
  if (!baseSubject.includes("!")) {
    variations.push(`${baseSubject} — Don't miss out!`);
  } else {
    variations.push(baseSubject.replace("!", " — act now!"));
  }

  // Variation C: Question format
  if (!baseSubject.includes("?")) {
    const words = baseSubject.split(" ");
    if (words.length > 3) {
      variations.push(`Ready for this? ${baseSubject}`);
    } else {
      variations.push(`${baseSubject} — interested?`);
    }
  }

  return variations.slice(0, 3);
}
