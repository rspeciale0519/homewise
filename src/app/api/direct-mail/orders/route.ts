import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { orderDraftCreateSchema } from "@/lib/direct-mail/schemas";

async function requireAgent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, email: true, firstName: true, lastName: true, phone: true },
  });
  if (!profile || (profile.role !== "agent" && profile.role !== "admin")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { profile };
}

export async function POST(req: Request) {
  const auth = await requireAgent();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = orderDraftCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const order = await prisma.mailOrder.create({
    data: {
      userId: auth.profile.id,
      workflow: parsed.data.workflow,
      status: "draft",
      currentStep: 1,
      quantity: 0,
    },
    select: { id: true, workflow: true, currentStep: true },
  });

  return NextResponse.json({ order }, { status: 201 });
}

export async function GET() {
  const auth = await requireAgent();
  if ("error" in auth) return auth.error;

  const orders = await prisma.mailOrder.findMany({
    where: { userId: auth.profile.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
    select: {
      id: true,
      status: true,
      workflow: true,
      productType: true,
      productSize: true,
      listFiles: true,
      submittedAt: true,
      createdAt: true,
      currentStep: true,
      emailStatus: true,
    },
  });

  return NextResponse.json({ orders });
}
