import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import {
  escapeHtml,
  escapeHttpUrl,
  personalizeTemplate,
  sendEmail,
} from "@/lib/email";
import { priceChangeAlertEmail } from "@/lib/email/templates";
import { createUnsubscribeToken } from "@/lib/email/action-token";
import { canSendPreferenceEmail } from "@/lib/email/suppression";
import { areMlsBackfillAlertsSuppressed } from "@/lib/mls-alert-suppression";
import { withIdx } from "@/lib/mls-visibility";
import { getSiteUrl } from "@/lib/site-url";

export const priceChangeAlert = inngest.createFunction(
  { id: "price-change-alert" },
  { event: "mls/listing.price-changed" },
  async ({ event, step }) => {
    const suppressed = await step.run("check-mls-backfill-alert-suppression", () => {
      return areMlsBackfillAlertsSuppressed();
    });

    if (suppressed) return { sent: 0, skipped: "mls-backfill-in-flight" };

    const { mlsId, oldPrice, newPrice, address, city } = event.data;
    const siteUrl = getSiteUrl();

    // Find users who favorited this listing
    const favorites = await step.run("find-favorites", async () => {
      const listing = await prisma.listing.findFirst({
        where: withIdx({ mlsId }),
        select: { id: true },
      });
      if (!listing) return [];

      return prisma.favoriteProperty.findMany({
        where: {
          propertyId: listing.id,
          user: { favoritePriceAlertsEnabled: true },
        },
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

        const unsubscribeToken = createUnsubscribeToken(
          { kind: "user", id: fav.user.id },
          fav.user.email,
        );
        const tokens: Record<string, string> = {
          first_name: escapeHtml(fav.user.firstName),
          property_address: escapeHtml(`${address}, ${city}`),
          old_price: `$${oldPrice.toLocaleString()}`,
          new_price: `$${newPrice.toLocaleString()}`,
          listing_url: escapeHttpUrl(`${siteUrl}/properties/${mlsId}`),
          unsubscribe_url: escapeHttpUrl(
            `${siteUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`,
          ),
        };

        if (!await canSendPreferenceEmail({
          kind: "user",
          id: fav.user.id,
          recipientEmail: fav.user.email,
        })) return;

        notifiedEmails.add(fav.user.email);
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

        const firstName = alert.user?.firstName ?? alert.name ?? "there";
        const unsubscribeToken = createUnsubscribeToken(
          { kind: "property_alert", id: alert.id },
          alert.email,
        );
        const tokens: Record<string, string> = {
          first_name: escapeHtml(firstName),
          property_address: escapeHtml(`${address}, ${city}`),
          old_price: `$${oldPrice.toLocaleString()}`,
          new_price: `$${newPrice.toLocaleString()}`,
          listing_url: escapeHttpUrl(`${siteUrl}/properties/${mlsId}`),
          unsubscribe_url: escapeHttpUrl(
            `${siteUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`,
          ),
        };

        if (!await canSendPreferenceEmail({
          kind: "property_alert",
          id: alert.id,
          recipientEmail: alert.email,
        })) return;

        notifiedEmails.add(alert.email);
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
