import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { detectRasterImageType, rasterImageExtension } from "./raster-image";

function jpeg(): Uint8Array {
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0x01,
    0xff, 0xd9,
  ]);
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function pngChunk(type: string, data: readonly number[]): number[] {
  const typeBytes = [...type].map((value) => value.charCodeAt(0));
  const length = data.length;
  const body = [...typeBytes, ...data];
  let crc = 0xffffffff;
  for (const byte of body) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  crc = (crc ^ 0xffffffff) >>> 0;
  return [
    (length >>> 24) & 0xff,
    (length >>> 16) & 0xff,
    (length >>> 8) & 0xff,
    length & 0xff,
    ...body,
    (crc >>> 24) & 0xff,
    (crc >>> 16) & 0xff,
    (crc >>> 8) & 0xff,
    crc & 0xff,
  ];
}

function png(): Uint8Array {
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...pngChunk("IHDR", [
      0x00, 0x00, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00,
    ]),
    ...pngChunk("IDAT", [0x78, 0x01, 0x01, 0x00, 0x00, 0x00]),
    ...pngChunk("IEND", []),
  ]);
}

function webp(): Uint8Array {
  return Uint8Array.from([
    0x52, 0x49, 0x46, 0x46,
    0x12, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x4c,
    0x06, 0x00, 0x00, 0x00,
    0x2f, 0x00, 0x00, 0x00, 0x00, 0x01,
  ]);
}

describe("detectRasterImageType", () => {
  it.each([
    ["image/jpeg", jpeg],
    ["image/png", png],
    ["image/webp", webp],
  ] as const)("detects a structurally complete %s", (type, bytes) => {
    expect(detectRasterImageType(bytes())).toBe(type);
  });

  it.each([
    { bytes: [0xff, 0xd8, 0xff, 0xe0] },
    { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
    { bytes: [
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50,
      ],
    },
  ])("rejects a header-only payload", (bytes) => {
    expect(detectRasterImageType(Uint8Array.from(bytes.bytes))).toBeNull();
  });

  it.each([jpeg, png, webp])("rejects a truncated image", (bytes) => {
    const complete = bytes();
    expect(detectRasterImageType(complete.subarray(0, complete.length - 1))).toBeNull();
  });

  it("rejects a PNG with a corrupt chunk CRC", () => {
    const bytes = png();
    bytes[20] = bytes[20]! ^ 0xff;
    expect(detectRasterImageType(bytes)).toBeNull();
  });

  it("rejects a WebP with a false RIFF size", () => {
    const bytes = webp();
    bytes[4] = bytes[4]! + 1;
    expect(detectRasterImageType(bytes)).toBeNull();
  });

  it("rejects data without an approved image structure", () => {
    expect(detectRasterImageType(new TextEncoder().encode("<script>"))).toBeNull();
  });

  it("accepts the repository logo PNG", () => {
    const bytes = readFileSync(resolve(process.cwd(), "public/images/logo.png"));
    expect(detectRasterImageType(bytes)).toBe("image/png");
  });
});

describe("rasterImageExtension", () => {
  it("uses a server-controlled extension", () => {
    expect(rasterImageExtension("image/jpeg")).toBe("jpg");
    expect(rasterImageExtension("image/png")).toBe("png");
    expect(rasterImageExtension("image/webp")).toBe("webp");
  });
});
