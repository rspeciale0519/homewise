import { NextRequest, NextResponse } from "next/server";
import { propertyAlertSchema } from "@/schemas/property-alert.schema";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = propertyAlertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const authenticatedEmail = user?.email ?? null;

    if (authenticatedEmail && parsed.data.email !== authenticatedEmail) {
      return NextResponse.json(
        { error: "Authenticated users can only manage alerts for their own email." },
        { status: 403 }
      );
    }

    const alertEmail = authenticatedEmail ?? parsed.data.email;
    const existingAlert = await prisma.propertyAlert.findUnique({
      where: { email: alertEmail },
      select: { email: true },
    });

    if (!existingAlert) {
      await prisma.propertyAlert.create({
        data: {
          email: alertEmail,
          name: parsed.data.name || null,
          cities: parsed.data.cities,
          minPrice: parsed.data.minPrice ?? null,
          maxPrice: parsed.data.maxPrice ?? null,
          beds: parsed.data.beds ?? null,
          userId: user?.id ?? null,
        },
      });
    } else if (user) {
      await prisma.propertyAlert.update({
        where: { email: alertEmail },
        data: {
          name: parsed.data.name || null,
          cities: parsed.data.cities,
          minPrice: parsed.data.minPrice ?? null,
          maxPrice: parsed.data.maxPrice ?? null,
          beds: parsed.data.beds ?? null,
          active: true,
          userId: user.id,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
