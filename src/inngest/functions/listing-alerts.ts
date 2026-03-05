import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { sendEmail, personalizeTemplate, buildEmailHtml } from "@/lib/email";
import { listingAlertEmail } from "@/lib/email/templates";

export const dailyListingAlerts = inngest.createFunction(
  { id: "daily-listing-alerts", concurrency: { limit: 1 } },
  { cron: "0 8 * * *" }, // Daily at 8 AM
  async ({ step }) => {
    const oneDayAgo = new Date(Date.now() - 86400000);

    const newListings = await step.run("fetch-new-listings", async () => {
      return prisma.listing.findMany({
        where: {
          status: "Active",
          createdAt: { gte: oneDayAgo },
        },
        select: {
          id: true,
          mlsId: true,
          address: true,
          city: true,
          price: true,
          beds: true,
          baths: true,
          sqft: true,
          imageUrl: true,
        },
      });
    });

    if (newListings.length === 0) return { alerts: 0 };

    const alerts = await step.run("fetch-active-alerts", async () => {
      return prisma.propertyAlert.findMany({
        where: { active: true },
        include: { user: { select: { firstName: true } } },
      });
    });

    let sentCount = 0;

    for (const alert of alerts) {
      await step.run(`alert-${alert.id}`, async () => {
        const matching = newListings.filter((listing) => {
          if (alert.cities.length > 0 && !alert.cities.some((c) => c.toLowerCase() === listing.city.toLowerCase())) return false;
          if (alert.minPrice && listing.price < alert.minPrice) return false;
          if (alert.maxPrice && listing.price > alert.maxPrice) return false;
          if (alert.beds && listing.beds < alert.beds) return false;
          return true;
        });

        if (matching.length === 0) return;

        const listingsHtml = matching.slice(0, 6).map((l) => `
          <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:12px">
            ${l.imageUrl ? `<img src="${l.imageUrl}" alt="${l.address}" style="width:100%;height:160px;object-fit:cover">` : ""}
            <div style="padding:12px">
              <p style="margin:0;font-weight:600">${l.address}, ${l.city}</p>
              <p style="margin:4px 0;color:#2563eb;font-weight:700">$${l.price.toLocaleString()}</p>
              <p style="margin:0;font-size:13px;color:#64748b">${l.beds} bed · ${l.baths} bath · ${l.sqft.toLocaleString()} sqft</p>
            </div>
          </div>
        `).join("");

        const template = listingAlertEmail();
        const firstName = alert.user?.firstName ?? alert.name ?? "there";
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homewisefl.com";
        const tokens: Record<string, string> = {
          first_name: firstName,
          count: String(matching.length),
          listings_html: listingsHtml,
          site_url: siteUrl,
          unsubscribe_url: `${siteUrl}/unsubscribe?alert=${alert.id}`,
        };

        await sendEmail({
          to: alert.email,
          subject: personalizeTemplate(template.subject, tokens),
          html: personalizeTemplate(template.html, tokens),
          tags: [{ name: "type", value: "listing_alert" }],
        });

        sentCount++;
      });
    }

    return { alerts: sentCount, newListings: newListings.length };
  },
);
