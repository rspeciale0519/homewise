import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { sendEmail, personalizeTemplate, buildEmailHtml } from "@/lib/email";

export const monthlyMarketEmail = inngest.createFunction(
  { id: "monthly-market-email", concurrency: { limit: 1 } },
  { cron: "0 8 1 * *" }, // First of month at 8 AM
  async ({ step }) => {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const stats = await step.run("fetch-stats", async () => {
      return prisma.marketStats.findMany({
        where: { period, areaType: "city" },
        orderBy: { area: "asc" },
      });
    });

    if (stats.length === 0) return { sent: 0 };

    const subscribers = await step.run("fetch-subscribers", async () => {
      return prisma.propertyAlert.findMany({
        where: { active: true },
        include: { user: { select: { firstName: true } } },
      });
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homewisefl.com";

    const statsHtml = stats.slice(0, 10).map((s) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600">${s.area}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">$${s.medianPrice.toLocaleString()}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${s.activeCount}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${s.avgDom} days</td>
      </tr>
    `).join("");

    const emailBody = `
      <h2>Monthly Market Report — ${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
      <p>Hi {{first_name}}, here's your monthly market snapshot for Central Florida:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0">City</th>
            <th style="padding:8px;text-align:right;border-bottom:2px solid #e2e8f0">Median Price</th>
            <th style="padding:8px;text-align:right;border-bottom:2px solid #e2e8f0">Active</th>
            <th style="padding:8px;text-align:right;border-bottom:2px solid #e2e8f0">Avg DOM</th>
          </tr>
        </thead>
        <tbody>${statsHtml}</tbody>
      </table>
      <p style="text-align:center;margin-top:24px">
        <a href="{{site_url}}/market/orlando" class="btn">View Full Report</a>
      </p>
    `;

    let sent = 0;

    for (const sub of subscribers) {
      await step.run(`email-${sub.id}`, async () => {
        const firstName = sub.user?.firstName ?? sub.name ?? "there";
        const tokens: Record<string, string> = {
          first_name: firstName,
          site_url: siteUrl,
          unsubscribe_url: `${siteUrl}/unsubscribe?alert=${sub.id}`,
        };

        await sendEmail({
          to: sub.email,
          subject: personalizeTemplate(`${now.toLocaleDateString("en-US", { month: "long" })} Central FL Market Report`, tokens),
          html: buildEmailHtml(personalizeTemplate(emailBody, tokens)),
          tags: [{ name: "type", value: "monthly_market" }],
        });
        sent++;
      });
    }

    return { sent, statsCount: stats.length };
  },
);
