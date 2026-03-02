import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { adminAgentUpdateSchema } from "@/schemas/admin-agent.schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;

  try {
    const agent = await prisma.agent.findUnique({ where: { id } });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;
  const body: unknown = await request.json();
  const parsed = adminAgentUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const data = parsed.data;
    const updated = await prisma.agent.update({
      where: { id },
      data: {
        ...data,
        email: data.email === "" ? null : data.email,
        phone: data.phone === "" ? null : data.phone,
        photoUrl: data.photoUrl === "" ? null : data.photoUrl,
        bio: data.bio === "" ? null : data.bio,
      },
    });

    return NextResponse.json({ agent: updated });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
