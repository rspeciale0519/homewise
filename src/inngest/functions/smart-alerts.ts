import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { sendEmail, personalizeTemplate, buildEmailHtml } from "@/lib/email";
import { semanticSearch } from "@/lib/ai/embeddings";

export const smartListingAlerts = inngest.createFunction(
  { id: "smart-listing-alerts", concurrency: { limit: 1 } },
  { cron: "0 9 * * *" }, // Daily at 9 AM
  async ({ step }) => {
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
        const where: Record<string, unknown> = {
          status: "Active",
          createdAt: { gte: oneDayAgo },
        };

        if (filters.city) where.city = { equals: filters.city, mode: "insensitive" };
        if (filters.minPrice) where.price = { gte: filters.minPrice };
        if (filters.maxPrice) where.price = { ...((where.price as Record<string, unknown>) ?? {}), lte: filters.maxPrice };
        if (filters.beds) where.beds = { gte: filters.beds };
        if (filters.baths) where.baths = { gte: filters.baths };

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
                where: { id: { in: suggestionIds }, createdAt: { gte: oneDayAgo } },
                select: { id: true, mlsId: true, address: true, city: true, price: true, beds: true, baths: true, sqft: true, imageUrl: true },
              });
            }
          }
        }

        const totalMatches = exactMatches.length + aiSuggestions.length;
        if (totalMatches === 0) return;

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homewisefl.com";

        const formatListings = (listings: typeof exactMatches) => listings.map((l) => `
          <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:12px">
            ${l.imageUrl ? `<img src="${l.imageUrl}" alt="${l.address}" style="width:100%;height:160px;object-fit:cover">` : ""}
            <div style="padding:12px">
              <p style="margin:0;font-weight:600">${l.address}, ${l.city}</p>
              <p style="margin:4px 0;color:#2563eb;font-weight:700">$${l.price.toLocaleString()}</p>
              <p style="margin:0;font-size:13px;color:#64748b">${l.beds} bed · ${l.baths} bath · ${l.sqft.toLocaleString()} sqft</p>
            </div>
          </div>
        `).join("");

        let listingsHtml = formatListings(exactMatches);
        if (aiSuggestions.length > 0) {
          listingsHtml += `<h3 style="color:#6366f1;margin-top:20px">AI Suggestions You Might Like</h3>`;
          listingsHtml += formatListings(aiSuggestions);
        }

        const tokens: Record<string, string> = {
          first_name: search.user.firstName,
          count: String(totalMatches),
          listings_html: listingsHtml,
          site_url: siteUrl,
          unsubscribe_url: `${siteUrl}/unsubscribe?search=${search.id}`,
        };

        await sendEmail({
          to: search.user.email,
          subject: personalizeTemplate(`{{count}} new listings match your search`, tokens),
          html: buildEmailHtml(personalizeTemplate(`
            <h2>New Listings for You!</h2>
            <p>Hi {{first_name}}, we found <strong>{{count}} new listings</strong> matching your saved search.</p>
            {{listings_html}}
            <p style="text-align:center;margin-top:24px">
              <a href="{{site_url}}/search" class="btn">View All Results</a>
            </p>
          `, tokens)),
          tags: [{ name: "type", value: "smart_alert" }],
        });

        sent++;
      });
    }

    return { searches: savedSearches.length, sent };
  },
);
