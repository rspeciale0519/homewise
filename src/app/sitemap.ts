import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { COMMUNITIES } from "@/data/content/communities";
import { SITE_URL } from "@/lib/constants";

const STATIC_ROUTES = [
  "",
  "/about",
  "/agents",
  "/properties",
  "/communities",
  "/buyers",
  "/buyers/preparing",
  "/buyers/location",
  "/buyers/moving-tips",
  "/buyers/condo-vs-house",
  "/buyers/home-inspection",
  "/buyers/request",
  "/sellers",
  "/sellers/staging",
  "/sellers/sell-fast",
  "/sellers/sounds-and-smells",
  "/sellers/seller-advice",
  "/home-evaluation",
  "/property-updates",
  "/privacy-policy",
  "/terms-of-service",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [agents, listings] = await Promise.all([
    prisma.agent.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.listing.findMany({
      where: { status: { in: ["Active", "Pending"] } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : route === "/properties" ? 0.9 : 0.7,
  }));

  const communityEntries: MetadataRoute.Sitemap = COMMUNITIES.map((c) => ({
    url: `${SITE_URL}/communities/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const agentEntries: MetadataRoute.Sitemap = agents.map((a) => ({
    url: `${SITE_URL}/agents/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const listingEntries: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${SITE_URL}/properties/${l.id}`,
    lastModified: l.updatedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    ...staticEntries,
    ...communityEntries,
    ...agentEntries,
    ...listingEntries,
  ];
}
