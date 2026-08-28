import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  fetchMock,
  releaseMock,
  recordBytesMock,
  uploadMock,
  refreshPhotoSourceMock,
  resolvePublicMlsMediaUrlMock,
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  releaseMock: vi.fn(),
  recordBytesMock: vi.fn(),
  uploadMock: vi.fn(),
  refreshPhotoSourceMock: vi.fn(),
  resolvePublicMlsMediaUrlMock: vi.fn(),
}));

vi.mock("@/lib/mls-image", async () => {
  const actual = await vi.importActual<typeof import("@/lib/mls-image")>("@/lib/mls-image");
  return {
    ...actual,
    resolvePublicMlsMediaUrl: resolvePublicMlsMediaUrlMock,
  };
});

vi.mock("@/lib/mls-media-budget", () => ({
  reserveMlsMediaDownload: () => ({
    allowed: true,
    recordBytes: recordBytesMock,
    release: releaseMock,
  }),
}));

vi.mock("@/lib/mls-photo-refresh", () => ({
  refreshPhotoSource: refreshPhotoSourceMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        getPublicUrl: () => ({
          data: { publicUrl: "https://project.supabase.co/storage/photo.jpg" },
        }),
        upload: uploadMock,
      }),
    },
  }),
}));

import { proxyPhotoUrl } from "@/lib/mls-image";
import { GET, MAX_MLS_PHOTO_BYTES } from "./route";

function photoRequest(sourceUrl = "https://media.mlsgrid.com/images/listing/photo.jpg") {
  const proxyUrl = proxyPhotoUrl(sourceUrl);
  return new NextRequest(`http://localhost${proxyUrl}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  process.env.MLS_GRID_BASE_URL = "https://api.mlsgrid.com/v2";
  process.env.MLS_IMAGE_SIGNING_SECRET = "signing-secret";
  process.env.MLS_GRID_TOKEN = "media-token";
  delete process.env.MLS_MEDIA_ALLOWED_HOSTS;
  recordBytesMock.mockReturnValue(true);
  uploadMock.mockResolvedValue({ error: null });
  refreshPhotoSourceMock.mockResolvedValue(null);
  resolvePublicMlsMediaUrlMock.mockImplementation(async (url: string) =>
    url.includes("169.254.169.254") ? null : url,
  );
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
});

describe("GET /api/mls-photo", () => {
  it("returns cached raster bytes for the Next.js image optimizer", async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(
      new Response(bytes, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );

    const response = await GET(photoRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    await expect(response.arrayBuffer()).resolves.toEqual(bytes.buffer);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(releaseMock).not.toHaveBeenCalled();
  });

  it("does not follow a redirect to an unapproved destination", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data" },
      }),
    );

    const response = await GET(photoRequest());

    expect(response.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: { "User-Agent": "media-token" },
      redirect: "manual",
    });
    expect(uploadMock).not.toHaveBeenCalled();
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it("does not forward the MLS Grid token to another approved media host", async () => {
    process.env.MLS_MEDIA_ALLOWED_HOSTS = "photos.stellarmls.com";
    resolvePublicMlsMediaUrlMock.mockImplementation(async (url: string) => url);
    fetchMock.mockResolvedValueOnce(new Response("not-an-image", {
      status: 502,
      headers: { "content-type": "text/plain" },
    }));

    await GET(photoRequest("https://photos.stellarmls.com/listing/photo.jpg"));

    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: undefined,
      redirect: "manual",
    });
  });

  it("aborts an image stream after the hard byte limit", async () => {
    let canceled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_MLS_PHOTO_BYTES));
        controller.enqueue(new Uint8Array(1));
      },
      cancel() {
        canceled = true;
      },
    });
    fetchMock.mockResolvedValueOnce(
      new Response(body, { status: 200, headers: { "content-type": "image/jpeg" } }),
    );

    const response = await GET(photoRequest());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "MLS photo exceeds the size limit",
    });
    expect(canceled).toBe(true);
    expect(recordBytesMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects active image content such as SVG", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<svg/>", {
        status: 200,
        headers: { "content-type": "image/svg+xml" },
      }),
    );

    const response = await GET(photoRequest());

    expect(response.status).toBe(502);
    expect(refreshPhotoSourceMock).toHaveBeenCalledOnce();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("stores and returns a bounded raster image", async () => {
    const bytes = new TextEncoder().encode("RIFF\u0004\u0000\u0000\u0000WEBPVP8 ");
    fetchMock.mockResolvedValueOnce(
      new Response(bytes, {
        status: 200,
        headers: { "content-type": "image/webp" },
      }),
    );

    const response = await GET(photoRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(recordBytesMock).toHaveBeenCalledWith(bytes.byteLength);
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}\.jpg$/),
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/webp" }),
    );
  });

  it("rejects a response whose bytes do not match its raster content type", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<script>alert(1)</script>", {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );

    const response = await GET(photoRequest());

    expect(response.status).toBe(502);
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
