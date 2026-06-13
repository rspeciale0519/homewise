import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isVowRegistered } from "@/lib/vow";
import { withVow } from "@/lib/mls-visibility";
import { logMlsAccess } from "@/lib/mls-access-log";

function clientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0]!.trim() : request.headers.get("x-real-ip");
}

/**
 * VOW sold-comparables lookup — expanded data available only to a registered
 * consumer (authenticated + accepted VOW terms). Public IDX surfaces do not
 * expose this sold-comp search. Every access is logged (License Agreement §VIII).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await isVowRegistered(user.id))) {
    return NextResponse.json(
      { error: "VOW registration required", code: "VOW_NOT_REGISTERED" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim() || undefined;
  const zip = searchParams.get("zip")?.trim() || undefined;
  if (!city && !zip) {
    return NextResponse.json({ error: "Provide a city or ZIP code." }, { status: 400 });
  }

  const comps = await prisma.listing.findMany({
    where: withVow({
      status: "Sold",
      ...(zip ? { zip } : {}),
      ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
    }),
    orderBy: { closeDate: "desc" },
    take: 25,
    select: {
      id: true, address: true, city: true, zip: true,
      price: true, closePrice: true, closeDate: true,
      beds: true, baths: true, sqft: true, yearBuilt: true,
      daysOnMarket: true, listingOfficeName: true, listingId: true,
    },
  });

  await logMlsAccess({
    userId: user.id,
    tier: "vow",
    action: "search",
    detail: `sold-comps ${city ?? ""} ${zip ?? ""} -> ${comps.length}`.trim(),
    ipAddress: clientIp(request),
  });

  return NextResponse.json({
    comps: comps.map((c) => ({
      ...c,
      closeDate: c.closeDate?.toISOString() ?? null,
    })),
  });
}
