import { prisma } from "@/lib/prisma";
import { SITE_NAME } from "@/lib/constants";
import { getSignedUrl } from "./storage";
import { bundleKeyFor, buildOrderBundle } from "./bundle";
import { sendDispatchFailureAlert, sendOrderToYls } from "./email";
import type { ArtworkLink, ListLink } from "./email";
import type { MailClass, ProductType, Workflow } from "./constants";
import type { ReturnAddress } from "./schemas";
import type { ArtworkFile, ListFile } from "./types";

export const SIGNED_URL_TTL_SECONDS = 30 * 24 * 60 * 60;

export type DispatchTrigger = "auto" | "resend_button" | "admin_retry";

export type DispatchOutcome = {
  success: boolean;
  messageId: string | null;
  error: string | null;
  skipped?: string;
};

/**
 * Build the email payload, send it, and persist the dispatch log + order
 * status. Used by both the Inngest function (for production retry semantics)
 * and the inline fallback (for local development without the inngest-cli
 * dev tunnel).
 */
export async function dispatchMailOrderOnce(
  orderId: string,
  triggeredBy: DispatchTrigger,
): Promise<DispatchOutcome> {
  const order = await prisma.mailOrder.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
  });

  if (!order || !order.user || order.status !== "submitted") {
    return {
      success: false,
      messageId: null,
      error: "order missing or not submitted",
      skipped: "order missing or not submitted",
    };
  }

  const artworkFiles = Array.isArray(order.artworkFiles)
    ? (order.artworkFiles as unknown as ArtworkFile[])
    : [];
  const listFiles = Array.isArray(order.listFiles)
    ? (order.listFiles as unknown as ListFile[])
    : [];

  if (!order.summaryPdfKey || artworkFiles.length === 0 || listFiles.length === 0) {
    await prisma.mailOrder.update({
      where: { id: orderId },
      data: {
        emailStatus: "failed",
        lastDispatchedAt: new Date(),
        dispatchAttempts: { increment: 1 },
      },
    });
    await prisma.mailOrderDispatchLog.create({
      data: {
        orderId,
        success: false,
        errorMessage: "Order missing one or more file keys",
        triggeredBy,
      },
    });
    return {
      success: false,
      messageId: null,
      error: "Order missing one or more file keys",
      skipped: "missing file keys",
    };
  }

  let signed: {
    summary: string;
    bundle: string | null;
    artworkLinks: ArtworkLink[];
    listLinks: ListLink[];
  };
  try {
    const summary = await getSignedUrl(order.summaryPdfKey, SIGNED_URL_TTL_SECONDS);
    const artworkLinks: ArtworkLink[] = await Promise.all(
      artworkFiles.map(async (f) => ({
        id: f.id,
        name: f.name,
        fileName: f.fileName,
        url: await getSignedUrl(f.fileKey, SIGNED_URL_TTL_SECONDS),
      })),
    );
    const listLinks: ListLink[] = await Promise.all(
      listFiles.map(async (l) => ({
        id: l.id,
        name: l.name,
        fileName: l.fileName,
        url: await getSignedUrl(l.fileKey, SIGNED_URL_TTL_SECONDS),
        rowCount: l.rowCount,
        columnsSent: l.columns.filter((c) => !l.excludedColumns.includes(c)),
        columnsExcluded: l.excludedColumns,
      })),
    );

    // The "Download all" ZIP is built at submit time, but if it doesn't
    // exist yet (older orders, or build failed) reconstruct it on demand
    // so the email always carries a working bundle link.
    let bundle: string | null;
    const bundleKey = bundleKeyFor(orderId);
    try {
      bundle = await getSignedUrl(bundleKey, SIGNED_URL_TTL_SECONDS);
    } catch {
      try {
        await buildOrderBundle({
          orderId,
          summaryPdfKey: order.summaryPdfKey,
          artworkFiles,
          listFiles: listFiles.map((l) => ({
            name: l.name,
            fileKey: l.fileKey,
            fileName: l.fileName,
          })),
        });
        bundle = await getSignedUrl(bundleKey, SIGNED_URL_TTL_SECONDS);
      } catch (rebuildErr) {
        console.error("[direct-mail] bundle rebuild failed", rebuildErr);
        bundle = null;
      }
    }

    signed = { summary, bundle, artworkLinks, listLinks };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to sign URLs";
    await prisma.mailOrder.update({
      where: { id: orderId },
      data: {
        emailStatus: "failed",
        lastDispatchedAt: new Date(),
        dispatchAttempts: { increment: 1 },
      },
    });
    await prisma.mailOrderDispatchLog.create({
      data: { orderId, success: false, errorMessage: msg, triggeredBy },
    });
    return { success: false, messageId: null, error: msg };
  }

  const agentName =
    `${order.user.firstName} ${order.user.lastName}`.trim() || order.user.email;
  const submittedAt = order.submittedAt ? new Date(order.submittedAt) : new Date();
  const dropDateStr = order.dropDate ? toIsoDate(new Date(order.dropDate)) : "";

  const result = await sendOrderToYls({
    orderRef: order.id,
    submittedAt,
    agent: {
      name: agentName,
      email: order.user.email,
      phone: order.user.phone,
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
    returnAddress: order.returnAddress as unknown as ReturnAddress,
    specialInstructions: order.specialInstructions,
    signedUrls: { summary: signed.summary, bundle: signed.bundle },
    artworkLinks: signed.artworkLinks,
    listLinks: signed.listLinks,
  });

  await prisma.mailOrderDispatchLog.create({
    data: {
      orderId,
      success: !result.error,
      emailMessageId: result.id,
      errorMessage: result.error,
      triggeredBy,
    },
  });

  if (result.error) {
    await prisma.mailOrder.update({
      where: { id: orderId },
      data: {
        emailStatus: "failed",
        lastDispatchedAt: new Date(),
        dispatchAttempts: { increment: 1 },
      },
    });
    if (triggeredBy === "auto") {
      try {
        await sendDispatchFailureAlert({
          orderRef: orderId,
          agentName,
          agentEmail: order.user.email,
          attempts: 1,
          lastError: result.error,
        });
      } catch {
        /* swallow alert-send errors */
      }
    }
    return { success: false, messageId: null, error: result.error };
  }

  await prisma.mailOrder.update({
    where: { id: orderId },
    data: {
      emailStatus: "sent",
      emailMessageId: result.id,
      lastDispatchedAt: new Date(),
      dispatchAttempts: { increment: 1 },
    },
  });
  return { success: true, messageId: result.id, error: null };
}

/**
 * In local development, Inngest events sent to the cloud cannot reach our
 * /api/inngest endpoint without the inngest-cli dev tunnel. This flag tells
 * the submit/resend/admin-retry endpoints to bypass Inngest and dispatch
 * inline so the email actually fires during local testing.
 */
export const SHOULD_DISPATCH_INLINE = process.env.NODE_ENV !== "production";

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
