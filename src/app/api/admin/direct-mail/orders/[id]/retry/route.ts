import { NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";

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
      frontFileKey: true,
      listFileKey: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "submitted") {
    return NextResponse.json({ error: "Only submitted orders can be retried" }, { status: 409 });
  }
  if (!order.summaryPdfKey || !order.frontFileKey || !order.listFileKey) {
    return NextResponse.json({ error: "Order missing required files" }, { status: 409 });
  }

  await prisma.mailOrder.update({
    where: { id },
    data: { emailStatus: "pending", lastDispatchedAt: new Date() },
  });

  await inngest.send({
    name: "direct-mail/order.submitted",
    data: { orderId: id, triggeredBy: "admin_retry" },
  });

  return NextResponse.json({ ok: true });
}
