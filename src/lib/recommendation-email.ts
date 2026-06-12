import { prisma } from "@/lib/prisma";
import { withIdx } from "@/lib/mls-visibility";
import { toAbsoluteSiteUrl } from "@/lib/site-url";
import {
  hasSignals,
  profileFromSignals,
  recommendListings,
  type BehaviorListing,
} from "@/lib/recommendations";

export const RECOMMENDED_LISTINGS_TOKEN = "recommended_listings";

type ContactForRecs = {
  email: string;
  prefBudgetMin: number | null;
  prefBudgetMax: number | null;
  prefCities: string[];
  prefMinBeds: number | null;
};

const BEHAVIOR_SELECT = {
  price: true,
  city: true,
  beds: true,
  hasPool: true,
  hasWaterfront: true,
} as const;

export async function recommendedListingsHtmlForContact(
  contact: ContactForRecs,
  siteUrl: string,
): Promise<string> {
  const behavior = await behaviorListingsForEmail(contact.email);

  const profile = profileFromSignals({
    preferred: {
      priceMin: contact.prefBudgetMin,
      priceMax: contact.prefBudgetMax,
      cities: contact.prefCities.map((c) => c.trim().toLowerCase()),
      minBeds: contact.prefMinBeds,
    },
    behavior,
  });
  if (!hasSignals(profile)) return "";

  const candidates = await prisma.listing.findMany({
    where: withIdx({ status: "Active" }),
    orderBy: { syncedAt: "desc" },
    take: 300,
    select: {
      id: true,
      price: true,
      city: true,
      beds: true,
      baths: true,
      sqft: true,
      address: true,
      imageUrl: true,
      hasPool: true,
      hasWaterfront: true,
      status: true,
      listingOfficeName: true,
    },
  });

  const top = recommendListings(profile, candidates, 3);
  if (top.length === 0) return "";

  const cards = top.map((listing) => {
    const imageUrl = toAbsoluteSiteUrl(listing.imageUrl, siteUrl);
    return `
      <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:12px">
        ${imageUrl ? `<img src="${imageUrl}" alt="${listing.address}" style="width:100%;height:160px;object-fit:cover">` : ""}
        <div style="padding:12px">
          <p style="margin:0;font-weight:600"><a href="${siteUrl}/properties/${listing.id}" style="color:#1e3a5f;text-decoration:none">${listing.address}, ${listing.city}</a></p>
          <p style="margin:4px 0;color:#2563eb;font-weight:700">$${listing.price.toLocaleString()}</p>
          <p style="margin:0;font-size:13px;color:#64748b">${listing.beds} bed · ${listing.baths} bath · ${listing.sqft.toLocaleString()} sqft</p>
          ${listing.listingOfficeName ? `<p style="margin:4px 0 0;font-size:11px;color:#94a3b8">Courtesy of ${listing.listingOfficeName}</p>` : ""}
        </div>
      </div>
    `;
  });

  return `<div><p style="font-weight:600;margin:0 0 8px">Homes picked for you</p>${cards.join("")}</div>`;
}

async function behaviorListingsForEmail(email: string): Promise<BehaviorListing[]> {
  const user = await prisma.userProfile.findFirst({
    where: { email },
    select: { id: true },
  });
  if (!user) return [];

  const [favorites, recents] = await Promise.all([
    prisma.favoriteProperty.findMany({
      where: { userId: user.id },
      orderBy: { savedAt: "desc" },
      take: 20,
      select: { propertyId: true },
    }),
    prisma.recentlyViewed.findMany({
      where: { userId: user.id },
      orderBy: { viewedAt: "desc" },
      take: 20,
      select: { propertyId: true },
    }),
  ]);

  const ids = [...new Set([...favorites, ...recents].map((row) => row.propertyId))];
  if (ids.length === 0) return [];

  return prisma.listing.findMany({
    where: { id: { in: ids } },
    select: BEHAVIOR_SELECT,
  });
}
