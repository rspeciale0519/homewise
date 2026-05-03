import JSZip from "jszip";
import { downloadObject, uploadAtKey } from "./storage";
import type { ArtworkFile } from "./types";

/**
 * The fixed storage key for an order's "download all" ZIP bundle.
 * Stored alongside the order's other files at:
 *   direct-mail-orders/{orderId}/all-files.zip
 */
export function bundleKeyFor(orderId: string): string {
  return `${orderId}/all-files.zip`;
}

export type BundleListEntry = {
  name: string;
  fileKey: string;
  fileName: string;
};

export type BundleInput = {
  orderId: string;
  summaryPdfKey: string;
  artworkFiles: ArtworkFile[];
  listFiles: BundleListEntry[];
};

/**
 * Download all order files from Supabase Storage, build a ZIP with a clean
 * folder structure, and upload it to the order's bundle key. Returns the
 * stored fileKey.
 *
 * ZIP layout:
 *   order-summary.pdf
 *   artwork/{description}.{ext}
 *   lists/{description}.csv
 *
 * Naming collisions across files (same description text) are de-duplicated
 * by appending " (N)".
 */
export async function buildOrderBundle(input: BundleInput): Promise<string> {
  const zip = new JSZip();

  const summary = await downloadObject(input.summaryPdfKey);
  zip.file("order-summary.pdf", summary.buffer);

  const artworkFolder = zip.folder("artwork");
  if (artworkFolder) {
    const used = new Set<string>();
    for (const f of input.artworkFiles) {
      const obj = await downloadObject(f.fileKey);
      const ext = extFromFileName(f.fileName);
      const name = uniqueName(used, sanitizeFilename(f.name), ext);
      artworkFolder.file(name, obj.buffer);
    }
  }

  const listsFolder = zip.folder("lists");
  if (listsFolder) {
    const used = new Set<string>();
    for (const l of input.listFiles) {
      const obj = await downloadObject(l.fileKey);
      const name = uniqueName(used, sanitizeFilename(l.name), "csv");
      listsFolder.file(name, obj.buffer);
    }
  }

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return uploadAtKey(bundleKeyFor(input.orderId), {
    buffer,
    mimeType: "application/zip",
    ext: "zip",
  });
}

/**
 * Replace filesystem-forbidden characters with underscore. Keeps spaces and
 * hyphens so the filename inside the ZIP reads naturally. Control characters
 * (codepoint 0–31) are filtered explicitly via codepoint comparison rather
 * than a regex character class to avoid escape-sequence pitfalls in source.
 */
export function sanitizeFilename(name: string): string {
  const forbidden = new Set(["<", ">", ":", "\"", "/", "\\", "|", "?", "*"]);
  let out = "";
  for (const ch of name) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 32 || forbidden.has(ch)) {
      out += "_";
    } else {
      out += ch;
    }
  }
  return out.replace(/\s+/g, " ").trim().slice(0, 80) || "file";
}

function extFromFileName(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx <= 0 || idx === fileName.length - 1) return "bin";
  return fileName.slice(idx + 1).toLowerCase();
}

function uniqueName(used: Set<string>, base: string, ext: string): string {
  let candidate = `${base}.${ext}`;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base} (${n}).${ext}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}
