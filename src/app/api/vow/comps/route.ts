import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isVowRegistered } from "@/lib/vow";
import { withVow } from "@/lib/mls-visibility";
import { logMlsAccess } from "@/lib/mls-access-log";
import { boundedStoredValue, trustedClientIp } from "@/lib/trusted-client";
import { z } from "zod";

const querySchema = z
  .object({
    city: z.string().trim().min(1).max(100).optional(),
    zip: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/).optional(),
  })
  .refine(({ city, zip }) => Boolean(city || zip));

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
  const parsedQuery = querySchema.safeParse({
    city: searchParams.get("city") ?? undefined,
    zip: searchParams.get("zip") ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Provide a city or ZIP code." }, { status: 400 });
  }
  const { city, zip } = parsedQuery.data;

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
    detail: boundedStoredValue(
      `sold-comps ${city ?? ""} ${zip ?? ""} -> ${comps.length}`.trim(),
      256,
    ),
    ipAddress: trustedClientIp(request),
  });

  return NextResponse.json({
    comps: comps.map((c) => ({
      ...c,
      closeDate: c.closeDate?.toISOString() ?? null,
    })),
  });
}
