import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { requireAdminApi, isError } from "@/lib/admin-api";

export async function POST() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  await inngest.send({ name: "mls-sync", data: {} });

  return NextResponse.json({ triggered: true });
}

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const syncState = await prisma.syncState.findUnique({
    where: { provider: "stellar" },
  });

  return NextResponse.json(syncState ?? { status: "never_run", totalSynced: 0 });
}
