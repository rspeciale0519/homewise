import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { invalidateModelCache } from "@/lib/ai";
import { z } from "zod";

export async function GET() {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const configs = await prisma.aiFeatureConfig.findMany({
    orderBy: { featureKey: "asc" },
  });

  return NextResponse.json(configs);
}

const patchSchema = z.array(
  z.object({
    featureKey: z.string().min(1),
    model: z.string().min(1),
    tier: z.string().min(1),
  }),
);

export async function PATCH(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const raw: unknown = await request.json();
  const input = patchSchema.safeParse(raw);
  if (!input.success) {
    return NextResponse.json(
      { error: "Validation failed", details: input.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  await Promise.all(
    input.data.map((row) =>
      prisma.aiFeatureConfig.update({
        where: { featureKey: row.featureKey },
        data: { model: row.model, tier: row.tier },
      }),
    ),
  );

  invalidateModelCache();

  return NextResponse.json({ ok: true });
}
