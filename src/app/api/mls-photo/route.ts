import { NextRequest, NextResponse } from "next/server";
import { parseAndVerify } from "@/lib/mls-image";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "mls-photos";
const YEAR_SECONDS = 31_536_000;

function responseHeaders(contentType: string): HeadersInit {
  return {
    "Content-Type": contentType,
    "Cache-Control": `public, max-age=${YEAR_SECONDS}, immutable`,
  };
}

async function cachedPublicUrl(publicUrl: string): Promise<boolean> {
  try {
    const response = await fetch(publicUrl, {
      method: "HEAD",
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const verified = parseAndVerify(request.nextUrl.searchParams);

  if (!verified) {
    return NextResponse.json({ error: "Invalid MLS photo signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  const storage = admin.storage.from(BUCKET);
  const { data: publicUrlData } = storage.getPublicUrl(verified.storageKey);
  const publicUrl = publicUrlData.publicUrl;

  if (await cachedPublicUrl(publicUrl)) {
    return NextResponse.redirect(publicUrl, 302);
  }

  const sourceResponse = await fetch(verified.sourceUrl, {
    headers: { "User-Agent": process.env.MLS_GRID_TOKEN ?? "" },
    cache: "no-store",
  });

  if (!sourceResponse.ok) {
    return NextResponse.json(
      { error: "MLS photo source fetch failed" },
      { status: 502 }
    );
  }

  const contentType = sourceResponse.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await sourceResponse.arrayBuffer());
  const { error: uploadError } = await storage.upload(verified.storageKey, buffer, {
    contentType,
    cacheControl: String(YEAR_SECONDS),
    upsert: true,
  });

  if (uploadError) {
    console.error("[mls-photo] Storage upload error:", uploadError.message);
    return NextResponse.json(
      { error: "MLS photo cache upload failed" },
      { status: 500 }
    );
  }

  return new NextResponse(buffer, {
    status: 200,
    headers: responseHeaders(contentType),
  });
}
