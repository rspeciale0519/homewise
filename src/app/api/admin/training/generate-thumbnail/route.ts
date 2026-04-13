import { NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";

export async function POST() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  // PDF thumbnail auto-generation is not yet available on Vercel serverless
  // (requires native canvas bindings). Admins should upload thumbnails manually.
  return NextResponse.json(
    { error: "Auto-generation not available. Please upload a thumbnail manually." },
    { status: 501 },
  );
}
