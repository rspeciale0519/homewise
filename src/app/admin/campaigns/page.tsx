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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-700">Campaigns</h1>
        <p className="text-sm text-slate-500">Manage drip email campaigns and automations</p>
      </div>
      <CampaignListView campaigns={serialized} />
    </div>
  );
}
