import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { removeOrderFiles } from "@/lib/direct-mail/storage";
import { ORDER_FILE_RETENTION_DAYS } from "@/lib/direct-mail/constants";

/**
 * Daily cron that enforces HomeWise's 30-day retention policy on direct-mail
 * order files.
 *
 * - Submitted orders older than 30 days: storage objects are deleted, the
 *   MailOrder row is kept but flagged with purgedAt and the file pointers are
 *   cleared. The agent can still see the historical record (date, type,
 *   recipient count) but the download buttons go away.
 * - Drafts older than 30 days: deleted entirely (storage + DB row). Stale
 *   drafts have no value; agents can re-create.
 *
 * YLS retains the order on their side indefinitely; this cron only governs
 * what HomeWise holds.
 */
export const purgeOldMailOrders = inngest.createFunction(
  { id: "purge-old-mail-orders" },
  { cron: "0 3 * * *" }, // 03:00 UTC daily
  async ({ step }) => {
    const cutoffMs = Date.now() - ORDER_FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const cutoff = new Date(cutoffMs);

    const expired = await step.run("find-expired", async () => {
      const submitted = await prisma.mailOrder.findMany({
        where: {
          status: "submitted",
          submittedAt: { lt: cutoff },
          purgedAt: null,
        },
        select: { id: true },
      });
      const drafts = await prisma.mailOrder.findMany({
        where: {
          status: "draft",
          updatedAt: { lt: cutoff },
        },
        select: { id: true },
      });
      return { submitted, drafts };
    });

    let purgedSubmitted = 0;
    let deletedDrafts = 0;
    const errors: Array<{ orderId: string; error: string }> = [];

    for (const order of expired.submitted) {
      const ok = await step.run(`purge-${order.id}`, async () => {
        try {
          await removeOrderFiles(order.id);
          await prisma.mailOrder.update({
            where: { id: order.id },
            data: {
              purgedAt: new Date(),
              artworkFiles: [],
              listFiles: [],
              summaryPdfKey: null,
            },
          });
          return { ok: true, error: null as string | null };
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : "unknown",
          };
        }
      });
      if (ok.ok) purgedSubmitted += 1;
      else if (ok.error) errors.push({ orderId: order.id, error: ok.error });
    }

    for (const draft of expired.drafts) {
      const ok = await step.run(`delete-draft-${draft.id}`, async () => {
        try {
          await removeOrderFiles(draft.id);
          await prisma.mailOrder.delete({ where: { id: draft.id } });
          return { ok: true, error: null as string | null };
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : "unknown",
          };
        }
      });
      if (ok.ok) deletedDrafts += 1;
      else if (ok.error) errors.push({ orderId: draft.id, error: ok.error });
    }

    return {
      cutoff: cutoff.toISOString(),
      purgedSubmitted,
      deletedDrafts,
      errors,
    };
  },
);
