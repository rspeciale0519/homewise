import { inngest } from "../client";
import { prisma } from "@/lib/prisma";

export const leadScoringCron = inngest.createFunction(
  { id: "lead-scoring-cron", concurrency: { limit: 1 } },
  { cron: "0 2 * * *" }, // Daily at 2 AM
  async ({ step }) => {
    const contacts = await step.run("fetch-active-contacts", async () => {
      return prisma.contact.findMany({
        where: { stage: { notIn: ["closed", "lost"] } },
        include: {
          activities: { orderBy: { createdAt: "desc" }, take: 10 },
          tags: { include: { tag: true } },
        },
        take: 200,
      });
    });

    let scored = 0;

    for (const contact of contacts) {
      await step.run(`score-${contact.id}`, async () => {
        let score = 0;
        const now = Date.now();

        // Recency scoring with time decay
        for (const activity of contact.activities) {
          const daysAgo = (now - new Date(activity.createdAt).getTime()) / 86400000;
          const decayFactor = Math.max(0, 1 - daysAgo / 30);

          switch (activity.type) {
            case "listing_view": score += 2 * decayFactor; break;
            case "search": score += 1 * decayFactor; break;
            case "form_submission": score += 10 * decayFactor; break;
            case "email_open": score += 3 * decayFactor; break;
            case "email_click": score += 5 * decayFactor; break;
            case "showing_request": score += 15 * decayFactor; break;
            default: score += 1 * decayFactor;
          }
        }

        // Stage-based bonus
        switch (contact.stage) {
          case "showing": score += 20; break;
          case "offer": score += 30; break;
          case "under_contract": score += 40; break;
          case "contacted": score += 5; break;
          case "searching": score += 10; break;
        }

        // Activity frequency bonus
        if (contact.activities.length >= 5) score += 10;
        if (contact.activities.length >= 10) score += 10;

        const finalScore = Math.min(100, Math.round(score));

        await prisma.contact.update({
          where: { id: contact.id },
          data: { score: finalScore },
        });

        scored++;
      });
    }

    return { processed: contacts.length, scored };
  },
);
