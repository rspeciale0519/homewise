import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { BroadcastListView } from "./broadcast-list-view";

export const metadata: Metadata = { title: "Broadcasts — Admin" };

export default async function BroadcastsPage() {
  const [broadcasts, tags] = await Promise.all([
    prisma.broadcast.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { contacts: true } } } }),
  ]);

  const serialized = broadcasts.map((b) => ({
    ...b,
    sentAt: b.sentAt?.toISOString() ?? null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-700">Broadcasts</h1>
        <p className="text-sm text-slate-500">Send one-time mass emails to tagged segments</p>
      </div>
      <BroadcastListView broadcasts={serialized} tags={tags.map((t) => ({ id: t.id, name: t.name, count: t._count.contacts }))} />
    </div>
  );
}
