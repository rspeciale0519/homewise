import { NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import {
  SHOULD_DISPATCH_INLINE,
  dispatchMailOrderOnce,
} from "@/lib/direct-mail/dispatch";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const order = await prisma.mailOrder.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      summaryPdfKey: true,
      artworkFiles: true,
      listFiles: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "submitted") {
    return NextResponse.json({ error: "Only submitted orders can be retried" }, { status: 409 });
  }
  const artworkLen = Array.isArray(order.artworkFiles) ? order.artworkFiles.length : 0;
  const listLen = Array.isArray(order.listFiles) ? order.listFiles.length : 0;
  if (!order.summaryPdfKey || listLen === 0 || artworkLen === 0) {
    return NextResponse.json({ error: "Order missing required files" }, { status: 409 });
  }

  await prisma.mailOrder.update({
    where: { id },
    data: { emailStatus: "pending", lastDispatchedAt: new Date() },
  });

  if (SHOULD_DISPATCH_INLINE) {
    await dispatchMailOrderOnce(id, "admin_retry");
  } else {
    await inngest.send({
      name: "direct-mail/order.submitted",
      data: { orderId: id, triggeredBy: "admin_retry" },
    });
  }

  return NextResponse.json({ ok: true });
}
