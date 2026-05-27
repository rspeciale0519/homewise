import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { adminFetchMock } = vi.hoisted(() => ({ adminFetchMock: vi.fn() }));

vi.mock("@/lib/admin-fetch", () => ({
  adminFetch: adminFetchMock,
}));

import { uploadEditorImage } from "./image-upload";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supa.example.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeImageFile(): File {
  return new File([new Uint8Array([1, 2, 3])], "hero.png", {
    type: "image/png",
  });
}

describe("uploadEditorImage", () => {
  it("rejects non-image files before hitting the API", async () => {
    const txt = new File(["x"], "doc.txt", { type: "text/plain" });
    await expect(uploadEditorImage(txt)).rejects.toThrow(
      "Only image files",
    );
    expect(adminFetchMock).not.toHaveBeenCalled();
  });

  it("requests a signed upload URL, PUTs the file, returns public URL", async () => {
    adminFetchMock.mockResolvedValue({
      uploadUrl: "https://supa.example.com/upload-signed",
      fileKey: "training/abc-hero.png",
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const url = await uploadEditorImage(makeImageFile());

    expect(adminFetchMock).toHaveBeenCalledWith(
      "/api/admin/training/upload",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          filename: "hero.png",
          contentType: "image/png",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://supa.example.com/upload-signed",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "image/png" },
      }),
    );
    expect(url).toBe(
      "https://supa.example.com/storage/v1/object/public/training-files/training/abc-hero.png",
    );
  });

  it("throws when the PUT fails", async () => {
    adminFetchMock.mockResolvedValue({
      uploadUrl: "https://supa.example.com/upload-signed",
      fileKey: "training/abc-hero.png",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 502 }),
    );
    await expect(uploadEditorImage(makeImageFile())).rejects.toThrow(
      /Upload failed/,
    );
  });
});
