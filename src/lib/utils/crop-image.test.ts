import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCroppedBlob, type CropArea } from "./crop-image";

// Mock canvas and image APIs for jsdom
function createMockImage(width: number, height: number) {
  const img = {
    width,
    height,
    onload: null as (() => void) | null,
    onerror: null as ((e: unknown) => void) | null,
    src: "",
  };
  Object.defineProperty(img, "src", {
    set() {
      setTimeout(() => img.onload?.(), 0);
    },
    get() {
      return "blob:mock";
    },
  });
  return img;
}

describe("getCroppedBlob", () => {
  const mockCropArea: CropArea = { x: 10, y: 20, width: 200, height: 200 };
  let mockContext: Record<string, unknown>;
  let mockCanvas: Record<string, unknown>;

  beforeEach(() => {
    mockContext = {
      drawImage: vi.fn(),
    };
    mockCanvas = {
      getContext: vi.fn(() => mockContext),
      width: 0,
      height: 0,
      toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
        cb(new Blob(["fake-image"], { type: "image/webp" }));
      }),
    };
    vi.stubGlobal("document", {
      createElement: vi.fn(() => mockCanvas),
    });
    vi.stubGlobal("Image", vi.fn(() => createMockImage(400, 400)));
  });

  it("returns a Blob with image/webp type", async () => {
    const blob = await getCroppedBlob("blob:test-url", mockCropArea);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/webp");
  });

  it("creates a 512x512 canvas", async () => {
    await getCroppedBlob("blob:test-url", mockCropArea);
    expect(mockCanvas.width).toBe(512);
    expect(mockCanvas.height).toBe(512);
  });

  it("calls drawImage with correct crop coordinates", async () => {
    await getCroppedBlob("blob:test-url", mockCropArea);
    expect(mockContext.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      10, 20, 200, 200,
      0, 0, 512, 512
    );
  });

  it("falls back to image/png if webp toBlob returns null", async () => {
    let callCount = 0;
    mockCanvas.toBlob = vi.fn((cb: (blob: Blob | null) => void, type: string) => {
      callCount++;
      if (type === "image/webp") {
        cb(null);
      } else {
        cb(new Blob(["fake-png"], { type: "image/png" }));
      }
    });

    const blob = await getCroppedBlob("blob:test-url", mockCropArea);
    expect(blob.type).toBe("image/png");
    expect(callCount).toBe(2);
  });

  it("rejects if canvas context is unavailable", async () => {
    mockCanvas.getContext = vi.fn(() => null);
    await expect(getCroppedBlob("blob:test-url", mockCropArea)).rejects.toThrow(
      "Canvas context unavailable"
    );
  });
});
