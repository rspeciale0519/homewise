import { Prisma } from "@prisma/client";
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { areMlsBackfillAlertsSuppressed } from "@/lib/mls-alert-suppression";
import { withIdx } from "@/lib/mls-visibility";
import { getSiteUrl, toAbsoluteSiteUrl } from "@/lib/site-url";
import { listingMatchesAlert, upcomingSlots, type DigestSlot } from "@/lib/open-house-digest";

type DigestListing = {
  id: string;
  address: string;
  city: string;
  price: number;
  beds: number;
  baths: number;
  imageUrl: string | null;
  slots: DigestSlot[];
};

export const weeklyOpenHouseDigest = inngest.createFunction(
  { id: "weekly-open-house-digest", concurrency: { limit: 1 } },
  { cron: "0 13 * * 4" }, // Thursdays, 8 AM ET
  async ({ step }) => {
    const suppressed = await step.run("check-suppression", () =>
      areMlsBackfillAlertsSuppressed(),
    );
    if (suppressed) return { sent: 0, skipped: "mls-backfill-in-flight" };

    const siteUrl = getSiteUrl();
    const now = new Date();

    const listings = await step.run("fetch-open-house-listings", async () => {
      const rows = await prisma.listing.findMany({
        where: withIdx({ status: "Active", openHouseSchedule: { not: Prisma.JsonNull } }),
        select: {
          id: true,
          address: true,
          city: true,
          price: true,
          beds: true,
          baths: true,
          imageUrl: true,
          openHouseSchedule: true,
        },
        take: 500,
      });

      return rows
        .map((row): DigestListing => ({
          id: row.id,
          address: row.address,
          city: row.city,
          price: row.price,
          beds: row.beds,
          baths: row.baths,
          imageUrl: row.imageUrl,
          slots: upcomingSlots(row.openHouseSchedule, now),
        }))
        .filter((row) => row.slots.length > 0);
    });

    if (listings.length === 0) {
      return { sent: 0, reason: "no-upcoming-open-houses" };
    }

    const alerts = await step.run("fetch-alert-subscribers", () =>
      prisma.propertyAlert.findMany({
        where: { active: true },
        include: { user: { select: { firstName: true } } },
      }),
    );

    let sent = 0;
    for (const alert of alerts) {
      await step.run(`digest-${alert.id}`, async () => {
        const matching = listings.filter((listing) =>
          listingMatchesAlert(listing, {
            cities: alert.cities,
            minPrice: alert.minPrice,
            maxPrice: alert.maxPrice,
            beds: alert.beds,
          }),
        );
        if (matching.length === 0) return;

        const cards = matching.slice(0, 8).map((listing) => {
          const imageUrl = toAbsoluteSiteUrl(listing.imageUrl, siteUrl);
          const slotLines = listing.slots
            .map((slot) => `${slot.date} · ${slot.startTime}–${slot.endTime}`)
            .join("<br/>");
          return `
            <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:12px">
              ${imageUrl ? `<img src="${imageUrl}" alt="${listing.address}" style="width:100%;height:160px;object-fit:cover">` : ""}
              <div style="padding:12px">
                <p style="margin:0;font-weight:600"><a href="${siteUrl}/properties/${listing.id}" style="color:#1e3a5f;text-decoration:none">${listing.address}, ${listing.city}</a></p>
                <p style="margin:4px 0;color:#2563eb;font-weight:700">$${listing.price.toLocaleString()}</p>
                <p style="margin:0 0 6px;font-size:13px;color:#64748b">${listing.beds} bed · ${listing.baths} bath</p>
                <p style="margin:0;font-size:13px;color:#0f766e;font-weight:600">${slotLines}</p>
              </div>
            </div>
          `;
        }).join("");

        const firstName = alert.user?.firstName ?? alert.name ?? "there";
        await sendEmail({
          to: alert.email,
          subject: `This week's open houses (${matching.length})`,
          html: [
            `<p>Hi ${firstName},</p>`,
            `<p>Here are the open houses coming up in your search areas this week:</p>`,
            cards,
            `<p style="font-size:12px;color:#94a3b8">You receive this weekly digest because property alerts are enabled. <a href="${siteUrl}/unsubscribe?alert=${alert.id}">Unsubscribe</a></p>`,
          ].join("\n"),
          tags: [{ name: "type", value: "open_house_digest" }],
        });
        sent++;
      });
    }

    return { sent, openHouseListings: listings.length };
  },
);
