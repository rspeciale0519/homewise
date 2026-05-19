export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_BATCH = 50;
export const UPLOAD_CONCURRENCY = 4;

export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".xlsx",
  ".xls",
  ".docx",
  ".doc",
  ".png",
  ".jpg",
  ".jpeg",
] as const;

export const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/png",
  "image/jpeg",
] as const;

export interface BulkUploadItem {
  name: string;
  storageKey: string;
  storageProvider: "supabase";
  mimeType: string | null;
  sizeBytes: number | null;
}

export interface BulkCreateResult {
  created: Array<{ id: string; name: string; slug: string }>;
  failed: Array<{ name: string; error: string }>;
}

export type FileValidation = { ok: true } | { ok: false; reason: string };

export function nameFromFilename(filename: string): string {
  const trimmed = filename.trim();
  const lastDot = trimmed.lastIndexOf(".");
  const base =
    lastDot > 0 ? trimmed.slice(0, lastDot) : lastDot === 0 ? "" : trimmed;
  const cleaned = base.trim();
  return cleaned.length > 0 ? cleaned : "Untitled";
}

function extensionOf(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.slice(lastDot).toLowerCase();
}

export function validateFile(file: {
  name: string;
  type: string;
  size: number;
}): FileValidation {
  if (
    !(ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))
  ) {
    return { ok: false, reason: "Unsupported file type" };
  }
  if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, reason: "Unsupported file type" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: "File exceeds 25 MB" };
  }
  return { ok: true };
}

export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function lane(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  const lanes = Array.from(
    { length: Math.min(limit, items.length) },
    () => lane(),
  );
  await Promise.all(lanes);
  return results;
}

export function xhrPut(
  url: string,
  body: Blob,
  opts: { onProgress?: (pct: number) => void; signal?: AbortSignal },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Upload failed (network)"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort();
      } else {
        opts.signal.addEventListener("abort", () => xhr.abort());
      }
    }
    xhr.send(body);
  });
}
