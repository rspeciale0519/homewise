import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  let config = await prisma.registrationConfig.findFirst();
  if (!config) {
    config = await prisma.registrationConfig.create({
      data: { viewThreshold: 5, mode: "soft", enabled: true },
    });
  }

  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body = await req.json();
  const { viewThreshold, mode, enabled } = body as {
    viewThreshold?: number;
    mode?: string;
    enabled?: boolean;
  };

  let config = await prisma.registrationConfig.findFirst();
  if (!config) {
    config = await prisma.registrationConfig.create({
      data: { viewThreshold: 5, mode: "soft", enabled: true },
    });
  }

  const updated = await prisma.registrationConfig.update({
    where: { id: config.id },
    data: {
      ...(viewThreshold !== undefined ? { viewThreshold } : {}),
      ...(mode !== undefined ? { mode } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
    },
  });

  return NextResponse.json(updated);
}
