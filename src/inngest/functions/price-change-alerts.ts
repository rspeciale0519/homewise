import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { sendEmail, personalizeTemplate } from "@/lib/email";
import { priceChangeAlertEmail } from "@/lib/email/templates";

export const priceChangeAlert = inngest.createFunction(
  { id: "price-change-alert" },
  { event: "mls/listing.price-changed" },
  async ({ event, step }) => {
    const { mlsId, oldPrice, newPrice, address, city } = event.data as {
      mlsId: string;
      oldPrice: number;
      newPrice: number;
      address: string;
      city: string;
    };

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homewisefl.com";

    // Find users who favorited this listing
    const favorites = await step.run("find-favorites", async () => {
      const listing = await prisma.listing.findUnique({
        where: { mlsId },
        select: { id: true },
      });
      if (!listing) return [];

      return prisma.favoriteProperty.findMany({
        where: { propertyId: listing.id },
        include: { user: { select: { id: true, email: true, firstName: true } } },
      });
    });

    // Find saved searches matching this listing
    const alertRecipients = await step.run("find-alert-matches", async () => {
      return prisma.propertyAlert.findMany({
        where: {
          active: true,
          cities: { has: city },
        },
        include: { user: { select: { firstName: true } } },
      });
    });

    const template = priceChangeAlertEmail();
    let sent = 0;
    const notifiedEmails = new Set<string>();

    for (const fav of favorites) {
      await step.run(`notify-fav-${fav.id}`, async () => {
        if (notifiedEmails.has(fav.user.email)) return;
        notifiedEmails.add(fav.user.email);

        const tokens: Record<string, string> = {
          first_name: fav.user.firstName,
          property_address: `${address}, ${city}`,
          old_price: `$${oldPrice.toLocaleString()}`,
          new_price: `$${newPrice.toLocaleString()}`,
          listing_url: `${siteUrl}/properties/${mlsId}`,
          unsubscribe_url: `${siteUrl}/unsubscribe?id=${fav.user.id}`,
        };

        await sendEmail({
          to: fav.user.email,
          subject: personalizeTemplate(template.subject, tokens),
          html: personalizeTemplate(template.html, tokens),
          tags: [{ name: "type", value: "price_change" }],
        });
        sent++;
      });
    }

    for (const alert of alertRecipients) {
      await step.run(`notify-alert-${alert.id}`, async () => {
        if (notifiedEmails.has(alert.email)) return;
        notifiedEmails.add(alert.email);

        const firstName = alert.user?.firstName ?? alert.name ?? "there";
        const tokens: Record<string, string> = {
          first_name: firstName,
          property_address: `${address}, ${city}`,
          old_price: `$${oldPrice.toLocaleString()}`,
          new_price: `$${newPrice.toLocaleString()}`,
          listing_url: `${siteUrl}/properties/${mlsId}`,
          unsubscribe_url: `${siteUrl}/unsubscribe?alert=${alert.id}`,
        };

        await sendEmail({
          to: alert.email,
          subject: personalizeTemplate(template.subject, tokens),
          html: personalizeTemplate(template.html, tokens),
          tags: [{ name: "type", value: "price_change" }],
        });
        sent++;
      });
    }

    return { sent };
  },
);
