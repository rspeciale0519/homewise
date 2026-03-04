import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CampaignDetailView } from "./campaign-detail-view";

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CampaignDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { name: true } });
  return { title: campaign ? `${campaign.name} — Campaigns` : "Campaign Not Found" };
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      emails: {
        orderBy: { sortOrder: "asc" },
        include: { variants: { orderBy: { variant: "asc" } } },
      },
      enrollments: {
        include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!campaign) notFound();

  const serialized = {
    ...campaign,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    emails: campaign.emails.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      variants: e.variants.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
    })),
    enrollments: campaign.enrollments.map((en) => ({
      ...en,
      nextSendAt: en.nextSendAt?.toISOString() ?? null,
      completedAt: en.completedAt?.toISOString() ?? null,
      createdAt: en.createdAt.toISOString(),
      updatedAt: en.updatedAt.toISOString(),
    })),
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/campaigns" className="text-sm text-slate-500 hover:text-navy-700 transition-colors">
          ← Back to Campaigns
        </Link>
      </div>
      <CampaignDetailView campaign={serialized} />
    </div>
  );
}
