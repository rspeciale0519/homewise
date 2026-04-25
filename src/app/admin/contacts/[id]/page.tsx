import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/ui/back-button";
import { ContactDetailView } from "./contact-detail-view";

interface ContactDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ContactDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const contact = await prisma.contact.findUnique({
    where: { id },
    select: { firstName: true, lastName: true },
  });
  return { title: contact ? `${contact.firstName} ${contact.lastName} — Contacts` : "Contact Not Found" };
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      assignedAgent: { select: { id: true, firstName: true, lastName: true } },
      tags: { include: { tag: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
      tasks: { orderBy: { dueDate: "asc" } },
      transactions: {
        include: {
          milestones: { orderBy: { sortOrder: "asc" } },
          documents: true,
        },
      },
    },
  });

  if (!contact) notFound();

  const agents = await prisma.agent.findMany({
    where: { active: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: "asc" },
  });

  const allTags = await prisma.tag.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <div className="mb-6">
        <BackButton fallbackHref="/admin/contacts" label="Back to Contacts" />
      </div>
      <ContactDetailView
        contact={{
          ...contact,
          createdAt: contact.createdAt.toISOString(),
          birthday: contact.birthday?.toISOString() ?? null,
          closeAnniversary: contact.closeAnniversary?.toISOString() ?? null,
          tags: contact.tags.map((t) => ({ tag: { id: t.tag.id, name: t.tag.name, color: t.tag.color } })),
          activities: contact.activities.map((a) => ({ ...a, createdAt: a.createdAt.toISOString(), metadata: a.metadata as unknown })),
          tasks: contact.tasks.map((t) => ({ ...t, dueDate: t.dueDate?.toISOString() ?? null, completedAt: t.completedAt?.toISOString() ?? null, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() })),
          transactions: contact.transactions.map((tx) => ({
            ...tx,
            closingDate: tx.closingDate?.toISOString() ?? null,
            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString(),
            milestones: tx.milestones.map((m) => ({ ...m, completedAt: m.completedAt?.toISOString() ?? null, targetDate: m.targetDate?.toISOString() ?? null, createdAt: m.createdAt.toISOString() })),
            documents: tx.documents.map((d) => ({ ...d, uploadedAt: d.uploadedAt?.toISOString() ?? null, createdAt: d.createdAt.toISOString() })),
          })),
        }}
        agents={agents}
        allTags={allTags}
      />
    </div>
  );
}
