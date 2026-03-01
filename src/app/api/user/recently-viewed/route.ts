import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recentlyViewed = await prisma.recentlyViewed.findMany({
    where: { userId: user.id },
    orderBy: { viewedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ recentlyViewed });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { propertyId } = await request.json();
  if (!propertyId || typeof propertyId !== "string") {
    return NextResponse.json({ error: "propertyId required" }, { status: 400 });
  }

  const record = await prisma.recentlyViewed.upsert({
    where: {
      userId_propertyId: {
        userId: user.id,
        propertyId,
      },
    },
    update: { viewedAt: new Date() },
    create: {
      userId: user.id,
      propertyId,
    },
  });

  return NextResponse.json({ record }, { status: 201 });
}
