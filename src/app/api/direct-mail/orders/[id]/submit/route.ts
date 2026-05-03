import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { orderSubmitSchema } from "@/lib/direct-mail/schemas";

// Phase 2: minimal submit that flips status. Phase 4 layers in PDF generation,
// Inngest dispatch, and email_status tracking on top of this same endpoint.
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

  const order = await prisma.mailOrder.findUnique({ where: { id } });
  if (!order || order.userId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (order.status !== "draft") {
    return NextResponse.json({ error: "Order is already submitted" }, { status: 409 });
  }

  const candidate = {
    workflow: order.workflow,
    subjectPropertyAddress: order.subjectPropertyAddress,
    campaignName: order.campaignName,
    productType: order.productType,
    productSize: order.productSize,
    mailClass: order.mailClass,
    dropDate: order.dropDate ? toIsoDate(order.dropDate) : null,
    returnAddress: order.returnAddress,
    quantity: order.quantity,
    specialInstructions: order.specialInstructions,
    frontFileKey: order.frontFileKey,
    backFileKey: order.backFileKey,
    listFileKey: order.listFileKey,
    listRowCount: order.listRowCount,
    complianceConfirmed: order.complianceConfirmed,
  };

  const parsed = orderSubmitSchema.safeParse(candidate);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Order is incomplete", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const updated = await prisma.mailOrder.update({
    where: { id: order.id },
    data: {
      status: "submitted",
      submittedAt: new Date(),
      emailStatus: "pending",
    },
    select: { id: true, submittedAt: true },
  });

  return NextResponse.json({ order: updated });
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
