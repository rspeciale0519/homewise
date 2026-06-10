import { prisma } from "@/lib/prisma";
import { authedFetch } from "@/lib/mls-grid";
import { canonicalMediaIdentity, proxyPhotoUrl } from "@/lib/mls-image";
import type { ResoProperty } from "@/types/reso";

function mlsGridBaseUrl(): string {
  return process.env.MLS_GRID_BASE_URL ?? "https://api.mlsgrid.com/v2";
}

/**
 * MLS Grid media URLs can rotate (signed tokens with short expiry). When a
 * stored source URL stops working, re-fetch the listing's current Media from
 * the API, match by canonical identity, and persist the refreshed URLs.
 * Returns the refreshed source URL for the requested photo, or null.
 */
function listingKeyFromMediaUrl(sourceUrl: string): string | null {
  const match = canonicalMediaIdentity(sourceUrl).match(/^\/images\/([^/]+)\//);
  return match?.[1] ?? null;
}

export async function refreshPhotoSource(staleSourceUrl: string): Promise<string | null> {
  const listingKey = listingKeyFromMediaUrl(staleSourceUrl);
  const listing = listingKey
    ? await prisma.listing.findUnique({
        where: { mlsId: listingKey },
        select: { id: true, mlsId: true, photoSources: true },
      })
    : await prisma.listing.findFirst({
        where: { photoSources: { has: staleSourceUrl } },
        select: { id: true, mlsId: true, photoSources: true },
      });

  if (!listing) return null;

  const entityUrl = `${mlsGridBaseUrl()}/Property('${listing.mlsId}')?$expand=Media`;
  const entity = (await authedFetch<ResoProperty>(entityUrl)) as unknown as ResoProperty;
  const media = [...(entity.Media ?? [])].sort((a, b) => (a.Order ?? 0) - (b.Order ?? 0));
  if (media.length === 0) return null;

  const freshByIdentity = new Map(
    media.map((item) => [canonicalMediaIdentity(item.MediaURL), item.MediaURL]),
  );

  const refreshedSources = listing.photoSources.map(
    (source) => freshByIdentity.get(canonicalMediaIdentity(source)) ?? source,
  );
  const refreshedPhotos = refreshedSources.map((source) => proxyPhotoUrl(source));

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      photoSources: refreshedSources,
      photos: refreshedPhotos,
      imageUrl: refreshedPhotos[0] ?? null,
    },
  });

  return freshByIdentity.get(canonicalMediaIdentity(staleSourceUrl)) ?? null;
}
