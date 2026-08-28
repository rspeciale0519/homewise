import { NextRequest, NextResponse } from "next/server";
import { parseAndVerify, resolvePublicMlsMediaUrl } from "@/lib/mls-image";
import { reserveMlsMediaDownload } from "@/lib/mls-media-budget";
import { refreshPhotoSource } from "@/lib/mls-photo-refresh";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "mls-photos";
const YEAR_SECONDS = 31_536_000;
export const MAX_MLS_PHOTO_BYTES = 15 * 1024 * 1024;
const MAX_SOURCE_REDIRECTS = 3;
const APPROVED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

class UnsafeMlsMediaUrlError extends Error {}
class MlsPhotoTooLargeError extends Error {}

type SourceFetch = {
  response: Response;
  abort: () => void;
};

function responseHeaders(contentType: string): HeadersInit {
  return {
    "Content-Type": contentType,
    "Cache-Control": `public, max-age=${YEAR_SECONDS}, immutable`,
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "X-Content-Type-Options": "nosniff",
  };
}

async function cachedImageResponse(publicUrl: string): Promise<NextResponse | null> {
  const controller = new AbortController();
  const abort = () => controller.abort();

  try {
    const response = await fetch(publicUrl, {
      cache: "no-store",
      signal: controller.signal,
    });

    const contentType = responseImageType(response);
    if (!contentType) {
      await discardResponse(response, abort);
      return null;
    }

    const buffer = await readImageWithLimit({ response, abort });
    abort();
    if (
      buffer.byteLength === 0 ||
      !hasExpectedImageSignature(buffer, contentType)
    ) {
      return null;
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: responseHeaders(contentType),
    });
  } catch {
    abort();
    return null;
  }
}

function responseImageType(response: Response): string | null {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  return response.ok && contentType && APPROVED_IMAGE_TYPES.has(contentType)
    ? contentType
    : null;
}

function isRedirect(response: Response): boolean {
  return [301, 302, 303, 307, 308].includes(response.status);
}

async function discardResponse(response: Response, abort: () => void): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
  abort();
}

async function fetchSource(sourceUrl: string): Promise<SourceFetch> {
  attempts:
  for (let attempt = 0; attempt < 2; attempt++) {
    let currentUrl = sourceUrl;

    for (let redirectCount = 0; redirectCount <= MAX_SOURCE_REDIRECTS; redirectCount++) {
      const approvedUrl = await resolvePublicMlsMediaUrl(currentUrl);
      if (!approvedUrl) {
        throw new UnsafeMlsMediaUrlError("MLS media URL is not approved");
      }

      const controller = new AbortController();
      const token = process.env.MLS_GRID_TOKEN?.trim();
      const hostname = new URL(approvedUrl).hostname.toLowerCase();
      const sendProviderToken = /^media(?:-[a-z0-9-]+)?\.mlsgrid\.com$/.test(hostname);
      const response = await fetch(approvedUrl, {
        headers: token && sendProviderToken ? { "User-Agent": token } : undefined,
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
      });
      const abort = () => controller.abort();

      if (isRedirect(response)) {
        const location = response.headers.get("location");
        if (!location || redirectCount === MAX_SOURCE_REDIRECTS) {
          await discardResponse(response, abort);
          throw new UnsafeMlsMediaUrlError("MLS media redirect is not approved");
        }

        let redirectUrl: string;
        try {
          redirectUrl = new URL(location, approvedUrl).toString();
        } catch {
          await discardResponse(response, abort);
          throw new UnsafeMlsMediaUrlError("MLS media redirect is invalid");
        }

        await discardResponse(response, abort);
        currentUrl = redirectUrl;
        continue;
      }

      if (response.status === 429 && attempt === 0) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "2");
        await discardResponse(response, abort);
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(Math.max(retryAfter, 1), 8) * 1000),
        );
        continue attempts;
      }

      return { response, abort };
    }
  }

  throw new Error("unreachable");
}

async function readImageWithLimit(source: SourceFetch): Promise<Buffer> {
  const declaredLength = Number(source.response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MLS_PHOTO_BYTES) {
    await discardResponse(source.response, source.abort);
    throw new MlsPhotoTooLargeError("MLS photo exceeds the byte limit");
  }

  const reader = source.response.body?.getReader();
  if (!reader) return Buffer.alloc(0);

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_MLS_PHOTO_BYTES) {
      await reader.cancel().catch(() => undefined);
      source.abort();
      throw new MlsPhotoTooLargeError("MLS photo exceeds the byte limit");
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks, totalBytes);
}

function ascii(bytes: Buffer, start: number, end: number): string {
  return bytes.subarray(start, end).toString("ascii");
}

function hasExpectedImageSignature(bytes: Buffer, contentType: string): boolean {
  switch (contentType) {
    case "image/jpeg":
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return (
        bytes.length >= 8 &&
        bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      );
    case "image/gif":
      return bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6));
    case "image/webp":
      return bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP";
    case "image/avif":
      return (
        bytes.length >= 12 &&
        ascii(bytes, 4, 8) === "ftyp" &&
        /(?:avif|avis)/.test(ascii(bytes, 8, Math.min(bytes.length, 64)))
      );
    default:
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

  const cachedResponse = await cachedImageResponse(publicUrl);
  if (cachedResponse) {
    return cachedResponse;
  }

  const reservation = reserveMlsMediaDownload();
  if (!reservation.allowed) {
    return budgetExceededResponse(reservation.reason, reservation.retryAfterSeconds);
  }

  try {
    let sourceFetch = await fetchSource(verified.sourceUrl);
    let sourceResponse = sourceFetch.response;

    // MLS Grid's media servers can answer expired-token URLs with a 2xx
    // status and a JSON error body, so a usable response must be an image.
    if (!responseImageType(sourceResponse) && sourceResponse.status !== 429) {
      await discardResponse(sourceResponse, sourceFetch.abort);
      const refreshedUrl = await refreshPhotoSource(verified.sourceUrl).catch((error) => {
        console.error("[mls-photo] Source refresh failed:", error);
        return null;
      });

      if (refreshedUrl) {
        sourceFetch = await fetchSource(refreshedUrl);
        sourceResponse = sourceFetch.response;
      }
    }

    if (sourceResponse.status === 429) {
      const retryAfter = sourceResponse.headers.get("Retry-After") ?? "5";
      await discardResponse(sourceResponse, sourceFetch.abort);
      return NextResponse.json(
        { error: "MLS photo source rate-limited" },
        { status: 429, headers: { "Retry-After": retryAfter } }
      );
    }

    const contentType = responseImageType(sourceResponse);
    if (!contentType) {
      await discardResponse(sourceResponse, sourceFetch.abort);
      return NextResponse.json(
        { error: "MLS photo source fetch failed" },
        { status: 502 }
      );
    }

    const buffer = await readImageWithLimit(sourceFetch);
    sourceFetch.abort();
    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: "MLS photo source fetch failed" }, { status: 502 });
    }
    if (!hasExpectedImageSignature(buffer, contentType)) {
      return NextResponse.json({ error: "MLS photo source fetch failed" }, { status: 502 });
    }

    if (!reservation.recordBytes(buffer.byteLength)) {
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

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: responseHeaders(contentType),
    });
  } catch (error) {
    if (error instanceof MlsPhotoTooLargeError) {
      return NextResponse.json({ error: "MLS photo exceeds the size limit" }, { status: 502 });
    }

    console.error(
      "[mls-photo] Source fetch error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "MLS photo source fetch failed" }, { status: 502 });
  } finally {
    reservation.release();
  }
}
