import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logApiError } from "@/lib/api-error";
import { orderDraftPatchSchema } from "@/lib/direct-mail/schemas";
import { removeOrderFiles } from "@/lib/direct-mail/storage";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";

const DELETE_LEASE_MS = 15 * 60 * 1000;

async function requireAgent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!profile || (profile.role !== "agent" && profile.role !== "admin")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { profile };
}

async function loadOwnedOrder(orderId: string, userId: string) {
  const order = await prisma.mailOrder.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== userId) return null;
  return order;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireAgent();
  if ("error" in auth) return auth.error;

  const order = await loadOwnedOrder(id, auth.profile.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireAgent();
  if ("error" in auth) return auth.error;

  const order = await loadOwnedOrder(id, auth.profile.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "draft") {
    return NextResponse.json({ error: "Submitted orders cannot be edited" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(req, 2_000_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = orderDraftPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const data: Prisma.MailOrderUpdateInput = {};
  const p = parsed.data;
  if (p.currentStep !== undefined) data.currentStep = p.currentStep;
  if (p.workflow !== undefined) data.workflow = p.workflow;
  if (p.subjectPropertyAddress !== undefined) data.subjectPropertyAddress = p.subjectPropertyAddress;
  if (p.campaignName !== undefined) data.campaignName = p.campaignName;
  if (p.productType !== undefined) data.productType = p.productType;
  if (p.productSize !== undefined) data.productSize = p.productSize;
  if (p.mailClass !== undefined) data.mailClass = p.mailClass;
  if (p.dropDate !== undefined) data.dropDate = p.dropDate ? new Date(p.dropDate) : null;
  if (p.returnAddress !== undefined) data.returnAddress = p.returnAddress as Prisma.InputJsonValue;
  if (p.quantity !== undefined) data.quantity = p.quantity;
  if (p.specialInstructions !== undefined) data.specialInstructions = p.specialInstructions;
  if (p.artworkFiles !== undefined) data.artworkFiles = p.artworkFiles as unknown as Prisma.InputJsonValue;
  if (p.listFiles !== undefined) data.listFiles = p.listFiles as unknown as Prisma.InputJsonValue;
  if (p.complianceConfirmed !== undefined) data.complianceConfirmed = p.complianceConfirmed;

  const updateResult = await prisma.mailOrder.updateMany({
    where: { id: order.id, userId: auth.profile.id, status: "draft" },
    data,
  });
  if (updateResult.count !== 1) {
    return NextResponse.json({ error: "Submitted orders cannot be edited" }, { status: 409 });
  }

  const updated = await loadOwnedOrder(order.id, auth.profile.id);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ order: updated });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireAgent();
  if ("error" in auth) return auth.error;

  const order = await loadOwnedOrder(id, auth.profile.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const staleBefore = new Date(Date.now() - DELETE_LEASE_MS);
  const isRecoverableDelete =
    order.status === "deleting" && order.updatedAt < staleBefore;
  if (order.status !== "draft" && !isRecoverableDelete) {
    return NextResponse.json({ error: "Only drafts can be deleted" }, { status: 409 });
  }

  const deleteClaim = await prisma.mailOrder.updateMany({
    where: {
      id: order.id,
      userId: auth.profile.id,
      OR: [
        { status: "draft" },
        { status: "deleting", updatedAt: { lt: staleBefore } },
      ],
    },
    data: { status: "deleting" },
  });
  if (deleteClaim.count !== 1) {
    return NextResponse.json({ error: "Only drafts can be deleted" }, { status: 409 });
  }

  try {
    await removeOrderFiles(order.id);
  } catch (error) {
    await prisma.mailOrder.updateMany({
      where: { id: order.id, userId: auth.profile.id, status: "deleting" },
      data: { status: "draft" },
    });
    logApiError("direct-mail/delete-order-files", error);
    return NextResponse.json(
      { error: "Failed to delete the draft files" },
      { status: 502 },
    );
  }

  const deleted = await prisma.mailOrder.deleteMany({
    where: { id: order.id, userId: auth.profile.id, status: "deleting" },
  });
  if (deleted.count !== 1) {
    return NextResponse.json({ error: "The draft could not be deleted" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
