import { inngest } from "../client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildEmailHtml,
  escapeHtml,
  escapeHttpUrl,
  personalizeTemplate,
  sanitizeEmailSubject,
  sendEmail,
} from "@/lib/email";
import { createUnsubscribeToken } from "@/lib/email/action-token";
import { canSendPreferenceEmail } from "@/lib/email/suppression";
import { semanticSearch } from "@/lib/ai/embeddings";
import { areMlsBackfillAlertsSuppressed } from "@/lib/mls-alert-suppression";
import { withIdx } from "@/lib/mls-visibility";
import { getSiteUrl, toAbsoluteSiteUrl } from "@/lib/site-url";

export const smartListingAlerts = inngest.createFunction(
  { id: "smart-listing-alerts", concurrency: { limit: 1 } },
  { cron: "0 9 * * *" }, // Daily at 9 AM
  async ({ step }) => {
    const suppressed = await step.run("check-mls-backfill-alert-suppression", () => {
      return areMlsBackfillAlertsSuppressed();
    });

    if (suppressed) return { searches: 0, sent: 0, skipped: "mls-backfill-in-flight" };

    const oneDayAgo = new Date(Date.now() - 86400000);

    const savedSearches = await step.run("fetch-saved-searches", async () => {
      return prisma.savedSearch.findMany({
        where: { alertEnabled: true },
        include: { user: { select: { id: true, email: true, firstName: true } } },
      });
    });

    let sent = 0;

    for (const search of savedSearches) {
      await step.run(`alert-${search.id}`, async () => {
        const filters = search.filters as Record<string, unknown>;
        const mode = search.matchingMode;
        const rigidity = search.rigidity;

        // Exact match listings
        const where: Prisma.ListingWhereInput = withIdx({
          status: "Active",
          createdAt: { gte: oneDayAgo },
        });

        if (filters.city) where.city = { equals: String(filters.city), mode: "insensitive" };
        if (filters.minPrice) where.price = { gte: Number(filters.minPrice) };
        if (filters.maxPrice) where.price = { ...((where.price as Prisma.FloatFilter) ?? {}), lte: Number(filters.maxPrice) };
        if (filters.beds) where.beds = { gte: Number(filters.beds) };
        if (filters.baths) where.baths = { gte: Number(filters.baths) };

        const exactMatches = await prisma.listing.findMany({
          where,
          select: { id: true, mlsId: true, address: true, city: true, price: true, beds: true, baths: true, sqft: true, imageUrl: true },
          take: 10,
        });

        let aiSuggestions: typeof exactMatches = [];

        // For balanced/discovery modes, use semantic search for additional suggestions
        if (mode !== "strict" && rigidity < 70) {
          const searchTerms = [];
          if (filters.city) searchTerms.push(String(filters.city));
          if (filters.beds) searchTerms.push(`${filters.beds} bedrooms`);
          if (filters.propertyType) searchTerms.push(String(filters.propertyType));

          if (searchTerms.length > 0) {
            const semanticResults = await semanticSearch(
              searchTerms.join(", "),
              mode === "discovery" ? 6 : 3,
              {
                minPrice: filters.minPrice ? Number(filters.minPrice) * 0.8 : undefined,
                maxPrice: filters.maxPrice ? Number(filters.maxPrice) * 1.2 : undefined,
              },
            );

            const exactIds = new Set(exactMatches.map((m) => m.id));
            const suggestionIds = semanticResults
              .filter((r) => !exactIds.has(r.id))
              .map((r) => r.id);

            if (suggestionIds.length > 0) {
              aiSuggestions = await prisma.listing.findMany({
                where: withIdx({ id: { in: suggestionIds }, createdAt: { gte: oneDayAgo } }),
                select: { id: true, mlsId: true, address: true, city: true, price: true, beds: true, baths: true, sqft: true, imageUrl: true },
              });
            }
          }
        }

        const totalMatches = exactMatches.length + aiSuggestions.length;
        if (totalMatches === 0) return;

        const siteUrl = getSiteUrl();

        const formatListings = (listings: typeof exactMatches) => listings.map((l) => {
          const absoluteImageUrl = toAbsoluteSiteUrl(l.imageUrl, siteUrl);
          const imageUrl = absoluteImageUrl ? escapeHttpUrl(absoluteImageUrl) : "";
          const address = escapeHtml(l.address);
          const city = escapeHtml(l.city);
          const price = escapeHtml(l.price.toLocaleString());
          const beds = escapeHtml(String(l.beds));
          const baths = escapeHtml(String(l.baths));
          const sqft = escapeHtml(l.sqft.toLocaleString());

          return `
            <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:12px">
              ${imageUrl ? `<img src="${imageUrl}" alt="${address}" style="width:100%;height:160px;object-fit:cover">` : ""}
              <div style="padding:12px">
                <p style="margin:0;font-weight:600">${address}, ${city}</p>
                <p style="margin:4px 0;color:#2563eb;font-weight:700">$${price}</p>
                <p style="margin:0;font-size:13px;color:#64748b">${beds} bed · ${baths} bath · ${sqft} sqft</p>
              </div>
            </div>
          `;
        }).join("");

        let listingsHtml = formatListings(exactMatches);
        if (aiSuggestions.length > 0) {
          listingsHtml += `<h3 style="color:#6366f1;margin-top:20px">AI Suggestions You Might Like</h3>`;
          listingsHtml += formatListings(aiSuggestions);
        }

        const unsubscribeToken = createUnsubscribeToken(
          { kind: "saved_search", id: search.id },
          search.user.email,
        );
        const safeTokens: Record<string, string> = {
          first_name: escapeHtml(search.user.firstName),
          count: escapeHtml(String(totalMatches)),
          // This fragment is trusted because formatListings escapes every
          // dynamic value before it creates the markup.
          listings_html: listingsHtml,
          search_url: escapeHttpUrl(`${siteUrl}/search`),
          unsubscribe_url: escapeHttpUrl(
            `${siteUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`,
          ),
        };
        const bodyTemplate = buildEmailHtml(`
          <h2>New Listings for You!</h2>
          <p>Hi {{first_name}}, we found <strong>{{count}} new listings</strong> matching your saved search.</p>
          {{listings_html}}
          <p style="text-align:center;margin-top:24px">
            <a href="{{search_url}}" class="btn">View All Results</a>
          </p>
        `);
        const personalizedHtml = personalizeTemplate(bodyTemplate, safeTokens);

        if (!await canSendPreferenceEmail({
          kind: "saved_search",
          id: search.id,
          recipientEmail: search.user.email,
        })) return;

        await sendEmail({
          to: search.user.email,
          subject: sanitizeEmailSubject(
            personalizeTemplate("{{count}} new listings match your search", safeTokens),
          ),
          html: personalizedHtml,
          tags: [{ name: "type", value: "smart_alert" }],
        });

        sent++;
      });
    }

    return { searches: savedSearches.length, sent };
  },
);
