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
  const [content, tracks] = await Promise.all([
    prisma.trainingContent.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.trainingTrack.findMany({
      include: {
        items: {
          include: { content: { select: { id: true, title: true } } },
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-700">Training Hub</h1>
        <p className="text-sm text-slate-500">
          {content.length} items across {tracks.length} tracks
        </p>
      </div>
      <TrainingAdminView
        content={content}
        tracks={tracks}
        categories={[...CATEGORIES]}
      />
    </div>
  );
}
