import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CampaignListView } from "./campaign-list-view";

export const metadata: Metadata = { title: "Campaigns — Admin" };

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      emails: { orderBy: { sortOrder: "asc" }, select: { id: true, subject: true, sortOrder: true, channel: true, delayDays: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = campaigns.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">Campaigns</h1>
      <p className="text-slate-500 text-sm mb-8">Manage drip email campaigns and automations</p>
      <CampaignListView campaigns={serialized} />
    </div>
  );
}
