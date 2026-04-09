import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { TrainingAdminView } from "./training-admin-view";

export const metadata: Metadata = { title: "Training Hub — Admin" };

const CATEGORIES = [
  "onboarding",
  "contracts",
  "compliance",
  "platform",
  "market_knowledge",
] as const;

export default async function TrainingAdminPage() {
  const tracks = await prisma.trainingCourse.findMany({
    include: {
      items: {
        include: { content: { select: { id: true, title: true, type: true } } },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">Training Hub</h1>
      <p className="text-slate-500 text-sm mb-8">
        Manage training content, courses, and agent progress
      </p>
      <TrainingAdminView
        tracks={tracks}
        categories={[...CATEGORIES]}
      />
    </div>
  );
}
