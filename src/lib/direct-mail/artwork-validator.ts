import { PDFDocument } from "pdf-lib";

export type ArtworkInspection = {
  widthInches?: number;
  heightInches?: number;
  dpi?: number;
  pageCount?: number;
  warnings: string[];
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const POINTS_PER_INCH = 72;
const DIMENSION_TOLERANCE_INCHES = 0.3;
const MIN_RECOMMENDED_DPI = 300;

export async function inspectArtwork(
  buffer: Buffer,
  mimeType: string,
  productSize?: string | null,
): Promise<ArtworkInspection> {
  let inspection: ArtworkInspection;
  switch (mimeType) {
    case "application/pdf":
      inspection = await inspectPdf(buffer);
      break;
    case "image/png":
      inspection = inspectPng(buffer);
      break;
    case "image/jpeg":
    case "image/jpg":
      inspection = inspectJpg(buffer);
      break;
    case "application/msword":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      // Word documents — YLS team converts to print-ready format on their end.
      // No DPI/dimension inspection possible (they're documents, not raster art).
      inspection = { warnings: [] };
      break;
    default:
      inspection = { warnings: [`Skipping inspection — unsupported type: ${mimeType}`] };
  }

  const sizeWarnings = warningsForExpectedSize(inspection, productSize);
  return { ...inspection, warnings: [...inspection.warnings, ...sizeWarnings] };
}

async function inspectPdf(buffer: Buffer): Promise<ArtworkInspection> {
  try {
    const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = doc.getPages();
    if (pages.length === 0) {
      return { warnings: ["PDF has no pages."] };
    }
    const first = pages[0];
    if (!first) return { warnings: ["Could not read PDF page."] };
    const { width, height } = first.getSize();
    return {
      widthInches: round2(width / POINTS_PER_INCH),
      heightInches: round2(height / POINTS_PER_INCH),
      pageCount: pages.length,
      warnings:
        pages.length > 2
          ? [`PDF has ${pages.length} pages — expected 1 for a single-sided piece, 2 for double-sided.`]
          : [],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return { warnings: [`Could not parse PDF: ${msg}`] };
  }
}

function inspectPng(buffer: Buffer): ArtworkInspection {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { warnings: ["Not a valid PNG (signature mismatch)."] };
  }
  const ihdrLength = buffer.readUInt32BE(8);
  if (ihdrLength !== 13) {
    return { warnings: ["Invalid PNG IHDR chunk length."] };
  }
  const widthPx = buffer.readUInt32BE(16);
  const heightPx = buffer.readUInt32BE(20);

  let dpi: number | undefined;
  let offset = 8 + 4 + 4 + 13 + 4;
  while (offset + 12 <= buffer.length) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === "pHYs" && len === 9) {
      const xPpu = buffer.readUInt32BE(offset + 8);
      const unit = buffer.readUInt8(offset + 8 + 8);
      if (unit === 1 && xPpu > 0) {
        dpi = Math.round(xPpu * 0.0254);
      }
      break;
    }
    if (type === "IDAT" || type === "IEND") break;
    offset += 12 + len;
  }

  if (!dpi || dpi <= 0) {
    return {
      warnings: ["Could not detect PNG DPI; defaulting to 72 DPI for size checks."],
    };
  }

  return {
    widthInches: round2(widthPx / dpi),
    heightInches: round2(heightPx / dpi),
    dpi,
    warnings: dpi < MIN_RECOMMENDED_DPI ? [lowDpiWarning(dpi)] : [],
  };
}

function inspectJpg(buffer: Buffer): ArtworkInspection {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return { warnings: ["Not a valid JPEG (signature mismatch)."] };
  }

  let widthPx: number | undefined;
  let heightPx: number | undefined;
  let dpi: number | undefined;

  let i = 2;
  while (i + 4 < buffer.length) {
    if (buffer[i] !== 0xff) break;
    const marker = buffer[i + 1];
    if (marker === undefined) break;
    if (marker === 0xd9 || marker === 0xda) break;
    const segLength = buffer.readUInt16BE(i + 2);

    if (marker === 0xe0 && i + 4 + 14 < buffer.length) {
      const id = buffer.subarray(i + 4, i + 4 + 4).toString("ascii");
      if (id === "JFIF") {
        const units = buffer.readUInt8(i + 4 + 7);
        const xDensity = buffer.readUInt16BE(i + 4 + 8);
        if (units === 1 && xDensity > 0) dpi = xDensity;
        else if (units === 2 && xDensity > 0) dpi = Math.round(xDensity * 2.54);
      }
    }
    if (marker !== undefined && marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8) {
      heightPx = buffer.readUInt16BE(i + 5);
      widthPx = buffer.readUInt16BE(i + 7);
      break;
    }
    i += 2 + segLength;
  }

  if (widthPx === undefined || heightPx === undefined) {
    return { warnings: ["Could not parse JPEG dimensions."] };
  }
  if (!dpi || dpi <= 0) {
    return {
      warnings: ["Could not detect JPEG DPI from JFIF; defaulting to 72."],
    };
  }
  return {
    widthInches: round2(widthPx / dpi),
    heightInches: round2(heightPx / dpi),
    dpi,
    warnings: dpi < MIN_RECOMMENDED_DPI ? [lowDpiWarning(dpi)] : [],
  };
}

export function parseProductSize(size: string | null | undefined): { w: number; h: number } | null {
  if (!size) return null;
  const m = size.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (!m || !m[1] || !m[2]) return null;
  const w = Number.parseFloat(m[1]);
  const h = Number.parseFloat(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  return { w, h };
}

export function warningsForExpectedSize(
  inspection: ArtworkInspection,
  productSize?: string | null,
): string[] {
  const expected = parseProductSize(productSize);
  if (!expected) return [];
  if (!inspection.widthInches || !inspection.heightInches) return [];
  const { widthInches: w, heightInches: h } = inspection;

  const matches =
    (within(w, expected.w) && within(h, expected.h)) ||
    (within(w, expected.h) && within(h, expected.w));
  if (matches) return [];
  return [
    `Artwork dimensions (${w}" × ${h}") don't match expected ${expected.w}" × ${expected.h}". Double-check the file or product size selection.`,
  ];
}

function within(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= DIMENSION_TOLERANCE_INCHES;
}

function lowDpiWarning(dpi: number): string {
  return `Detected ${dpi} DPI — print quality is best at ${MIN_RECOMMENDED_DPI}+. The file will still be sent to YLS as-is.`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
