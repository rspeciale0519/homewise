import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { favoriteSchema } from "@/schemas/favorite.schema";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const favorites = await prisma.favoriteProperty.findMany({
    where: { userId: user.id },
    orderBy: { savedAt: "desc" },
  });

  return NextResponse.json({ favorites });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = favoriteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const favorite = await prisma.favoriteProperty.upsert({
    where: {
      userId_propertyId: {
        userId: user.id,
        propertyId: parsed.data.propertyId,
      },
    },
    update: {
      notes: parsed.data.notes ?? undefined,
    },
    create: {
      userId: user.id,
      propertyId: parsed.data.propertyId,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json({ favorite }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = favoriteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const favorite = await prisma.favoriteProperty.update({
    where: {
      userId_propertyId: {
        userId: user.id,
        propertyId: parsed.data.propertyId,
      },
    },
    data: { notes: parsed.data.notes ?? null },
  });

  return NextResponse.json({ favorite });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { propertyId } = await request.json();
  if (!propertyId) {
    return NextResponse.json({ error: "propertyId required" }, { status: 400 });
  }

  await prisma.favoriteProperty.delete({
    where: {
      userId_propertyId: {
        userId: user.id,
        propertyId,
      },
    },
  });

  return NextResponse.json({ success: true });
}
