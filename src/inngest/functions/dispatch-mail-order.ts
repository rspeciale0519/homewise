import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { getSignedUrl } from "@/lib/direct-mail/storage";
import { sendDispatchFailureAlert, sendOrderToYls } from "@/lib/direct-mail/email";
import { SITE_NAME } from "@/lib/constants";
import type {
  MailClass,
  ProductType,
  Workflow,
} from "@/lib/direct-mail/constants";
import type { ReturnAddress } from "@/lib/direct-mail/schemas";

const SIGNED_URL_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_ATTEMPTS = 3;
const BACKOFF_SECONDS = [30, 120, 300];

export const dispatchMailOrder = inngest.createFunction(
  { id: "dispatch-mail-order", retries: 0 },
  { event: "direct-mail/order.submitted" },
  async ({ event, step }) => {
    const { orderId } = event.data as { orderId: string };

    const order = await step.run("load-order", async () => {
      return prisma.mailOrder.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true, phone: true },
          },
        },
      });
    });

    if (!order || !order.user || order.status !== "submitted") {
      return { skipped: true, reason: "order missing or not submitted" };
    }
    if (!order.frontFileKey || !order.listFileKey || !order.summaryPdfKey) {
      await markFailed(orderId, "Order missing one or more file keys");
      return { skipped: true, reason: "missing file keys" };
    }

    const signed = await step.run("sign-urls", async () => {
      const [summary, front, list, back] = await Promise.all([
        getSignedUrl(order.summaryPdfKey!, SIGNED_URL_TTL_SECONDS),
        getSignedUrl(order.frontFileKey!, SIGNED_URL_TTL_SECONDS),
        getSignedUrl(order.listFileKey!, SIGNED_URL_TTL_SECONDS),
        order.backFileKey ? getSignedUrl(order.backFileKey, SIGNED_URL_TTL_SECONDS) : Promise.resolve(null),
      ]);
      return { summary, front, list, back };
    });

    const agentName = `${order.user.firstName} ${order.user.lastName}`.trim() || order.user.email;
    const submittedAt = order.submittedAt ? new Date(order.submittedAt) : new Date();
    const dropDateStr = order.dropDate ? toIsoDate(new Date(order.dropDate)) : "";

    let lastError: string | null = null;
    let messageId: string | null = null;
    let attempt = 0;

    for (attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const outcome = await step.run(`send-attempt-${attempt}`, async () => {
        const result = await sendOrderToYls({
          orderRef: order.id,
          submittedAt,
          agent: {
            name: agentName,
            email: order.user!.email,
            phone: order.user!.phone,
            brokerage: SITE_NAME,
          },
          workflow: order.workflow as Workflow,
          subjectPropertyAddress: order.subjectPropertyAddress,
          campaignName: order.campaignName,
          productType: order.productType as ProductType,
          productSize: order.productSize ?? "",
          mailClass: order.mailClass as MailClass,
          dropDate: dropDateStr,
          quantity: order.quantity,
          listRowCount: order.listRowCount,
          returnAddress: order.returnAddress as unknown as ReturnAddress,
          specialInstructions: order.specialInstructions,
          signedUrls: signed,
        });

        await prisma.mailOrderDispatchLog.create({
          data: {
            orderId,
            success: !result.error,
            emailMessageId: result.id,
            errorMessage: result.error,
            triggeredBy: "auto",
          },
        });

        return result;
      });

      if (!outcome.error) {
        messageId = outcome.id;
        break;
      }
      lastError = outcome.error;

      if (attempt < MAX_ATTEMPTS) {
        const wait = BACKOFF_SECONDS[attempt - 1] ?? 60;
        await step.sleep(`backoff-${attempt}`, `${wait}s`);
      }
    }

    if (messageId) {
      await step.run("mark-sent", async () => {
        await prisma.mailOrder.update({
          where: { id: orderId },
          data: {
            emailStatus: "sent",
            emailMessageId: messageId,
            lastDispatchedAt: new Date(),
            dispatchAttempts: { increment: attempt },
          },
        });
      });
      return { success: true, messageId, attempts: attempt };
    }

    await step.run("mark-failed", async () => {
      await markFailed(orderId, lastError, attempt);
    });
    await step.run("alert-admin", async () => {
      await sendDispatchFailureAlert({
        orderRef: orderId,
        agentName,
        agentEmail: order.user!.email,
        attempts: attempt - 1,
        lastError,
      });
    });

    return { success: false, attempts: attempt - 1, lastError };
  },
);

async function markFailed(orderId: string, error: string | null, attempts = 1): Promise<void> {
  await prisma.mailOrder.update({
    where: { id: orderId },
    data: {
      emailStatus: "failed",
      lastDispatchedAt: new Date(),
      dispatchAttempts: { increment: attempts },
    },
  });
  if (error) {
    await prisma.mailOrderDispatchLog.create({
      data: {
        orderId,
        success: false,
        errorMessage: error,
        triggeredBy: "auto",
      },
    });
  }
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
