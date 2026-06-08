import { NextRequest, NextResponse } from "next/server";
import { parseAndVerify } from "@/lib/mls-image";
import { reserveMlsMediaDownload } from "@/lib/mls-media-budget";
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

function budgetExceededResponse(reason: string, retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "MLS photo media budget exceeded", reason },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
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

  const reservation = reserveMlsMediaDownload();
  if (!reservation.allowed) {
    return budgetExceededResponse(reservation.reason, reservation.retryAfterSeconds);
  }

  try {
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

    const contentLength = Number(sourceResponse.headers.get("content-length"));
    if (Number.isFinite(contentLength) && !reservation.recordBytes(contentLength)) {
      return budgetExceededResponse("hourly-byte-limit", 60);
    }

    const contentType = sourceResponse.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await sourceResponse.arrayBuffer());
    if (!Number.isFinite(contentLength) && !reservation.recordBytes(buffer.byteLength)) {
      return budgetExceededResponse("hourly-byte-limit", 60);
    }

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
  } finally {
    reservation.release();
  }
}
