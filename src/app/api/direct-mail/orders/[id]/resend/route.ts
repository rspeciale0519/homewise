import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { RESEND_RATE_LIMIT_MS } from "@/lib/direct-mail/constants";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!profile || (profile.role !== "agent" && profile.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const order = await prisma.mailOrder.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      status: true,
      lastDispatchedAt: true,
      summaryPdfKey: true,
      artworkFiles: true,
      listFiles: true,
    },
  });
  if (!order || order.userId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (order.status !== "submitted") {
    return NextResponse.json({ error: "Only submitted orders can be resent" }, { status: 409 });
  }
  const artworkLen = Array.isArray(order.artworkFiles) ? order.artworkFiles.length : 0;
  const listLen = Array.isArray(order.listFiles) ? order.listFiles.length : 0;
  if (!order.summaryPdfKey || listLen === 0 || artworkLen === 0) {
    return NextResponse.json(
      { error: "This order is missing files and cannot be resent. Contact support." },
      { status: 409 },
    );
  }

  if (order.lastDispatchedAt) {
    const sinceMs = Date.now() - order.lastDispatchedAt.getTime();
    if (sinceMs < RESEND_RATE_LIMIT_MS) {
      const remainingMs = RESEND_RATE_LIMIT_MS - sinceMs;
      return NextResponse.json(
        {
          error: "Please wait before resending — too many recent attempts.",
          retryAfterSeconds: Math.ceil(remainingMs / 1000),
        },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(remainingMs / 1000)) },
        },
      );
    }
  }

  await prisma.mailOrder.update({
    where: { id: order.id },
    data: { emailStatus: "pending", lastDispatchedAt: new Date() },
  });

  await inngest.send({
    name: "direct-mail/order.submitted",
    data: { orderId: order.id, triggeredBy: "resend_button" },
  });

  return NextResponse.json({ ok: true });
}
