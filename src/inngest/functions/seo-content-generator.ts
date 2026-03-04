import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { aiComplete } from "@/lib/ai";

const NEIGHBORHOODS = [
  { city: "Orlando", neighborhoods: ["Downtown Orlando", "Lake Nona", "Baldwin Park", "Thornton Park", "College Park"] },
  { city: "Winter Park", neighborhoods: ["Park Avenue", "Hannibal Square", "Via Tuscany"] },
  { city: "Oviedo", neighborhoods: ["Alafaya", "Tuskawilla"] },
  { city: "Sanford", neighborhoods: ["Historic Downtown Sanford", "Riverwalk"] },
  { city: "Kissimmee", neighborhoods: ["Celebration", "Poinciana"] },
  { city: "Winter Garden", neighborhoods: ["Horizon West", "Oakland Park"] },
];

export const generateSeoContent = inngest.createFunction(
  { id: "generate-seo-content", concurrency: { limit: 1 } },
  { cron: "0 3 1 * *" }, // Monthly on the 1st at 3 AM
  async ({ step }) => {
    let generated = 0;

    for (const area of NEIGHBORHOODS) {
      for (const neighborhood of area.neighborhoods) {
        await step.run(`seo-${area.city}-${neighborhood}`, async () => {
          const slug = `${area.city}-${neighborhood}`.toLowerCase().replace(/\s+/g, "-");
          const existing = await prisma.seoContent.findUnique({ where: { slug } });

          // Skip if recently refreshed (within 30 days)
          if (existing?.refreshedAt && existing.refreshedAt > new Date(Date.now() - 30 * 86400000)) return;

          const stats = await prisma.listing.aggregate({
            where: { city: { equals: area.city, mode: "insensitive" }, status: "Active" },
            _avg: { price: true, daysOnMarket: true },
            _count: true,
          });

          const prompt = `Write a neighborhood guide for ${neighborhood}, ${area.city}, FL.

Market data:
- Active listings in ${area.city}: ${stats._count}
- Average listing price: $${Math.round(stats._avg.price ?? 0).toLocaleString()}
- Average days on market: ${Math.round(stats._avg.daysOnMarket ?? 0)}

Generate a JSON response:
{
  "title": "<SEO-optimized page title>",
  "metaTitle": "<meta title, max 60 chars>",
  "metaDesc": "<meta description, max 155 chars>",
  "body": "<800-1200 word neighborhood guide in HTML. Include: overview, lifestyle, housing market, schools, dining, recreation, commute info, why buy here>"
}`;

          const result = await aiComplete({
            feature: "seo_content",
            systemPrompt: "You are a real estate content writer for Central Florida. Write SEO-optimized neighborhood guides. Be specific about local details. Output valid JSON only.",
            userMessage: prompt,
            maxTokens: 3000,
            temperature: 0.7,
          });

          let parsed: { title: string; metaTitle?: string; metaDesc?: string; body: string };
          try {
            const match = result.content.match(/\{[\s\S]*\}/);
            parsed = match ? JSON.parse(match[0]) : { title: `${neighborhood} Neighborhood Guide`, body: result.content };
          } catch {
            parsed = { title: `${neighborhood} Neighborhood Guide`, body: result.content };
          }

          await prisma.seoContent.upsert({
            where: { slug },
            create: {
              type: "neighborhood_guide",
              slug,
              title: parsed.title,
              body: parsed.body,
              metaTitle: parsed.metaTitle ?? null,
              metaDesc: parsed.metaDesc ?? null,
              city: area.city,
              neighborhood,
              status: "draft",
              refreshedAt: new Date(),
            },
            update: {
              title: parsed.title,
              body: parsed.body,
              metaTitle: parsed.metaTitle ?? null,
              metaDesc: parsed.metaDesc ?? null,
              status: "draft",
              refreshedAt: new Date(),
            },
          });

          generated++;
        });
      }
    }

    return { generated };
  },
);
