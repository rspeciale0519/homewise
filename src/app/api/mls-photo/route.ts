import { NextRequest, NextResponse } from "next/server";
import { parseAndVerify } from "@/lib/mls-image";
import { reserveMlsMediaDownload } from "@/lib/mls-media-budget";
import { refreshPhotoSource } from "@/lib/mls-photo-refresh";
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

async function fetchSource(sourceUrl: string): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": process.env.MLS_GRID_TOKEN ?? "" },
      cache: "no-store",
    });

    if (response.status !== 429 || attempt > 0) {
      return response;
    }

    const retryAfter = Number(response.headers.get("Retry-After") ?? "2");
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(Math.max(retryAfter, 1), 8) * 1000),
    );
  }

  throw new Error("unreachable");
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
    let sourceResponse = await fetchSource(verified.sourceUrl);

    if (!sourceResponse.ok && sourceResponse.status !== 429) {
      const refreshedUrl = await refreshPhotoSource(verified.sourceUrl).catch((error) => {
        console.error("[mls-photo] Source refresh failed:", error);
        return null;
      });

      if (refreshedUrl) {
        sourceResponse = await fetchSource(refreshedUrl);
      }
    }

    if (sourceResponse.status === 429) {
      const retryAfter = sourceResponse.headers.get("Retry-After") ?? "5";
      return NextResponse.json(
        { error: "MLS photo source rate-limited" },
        { status: 429, headers: { "Retry-After": retryAfter } }
      );
    }

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
