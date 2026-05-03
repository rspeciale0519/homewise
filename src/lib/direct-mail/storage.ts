import { createAdminClient } from "@/lib/supabase/admin";

export const STORAGE_BUCKET = process.env.DIRECT_MAIL_STORAGE_BUCKET ?? "direct-mail-orders";

export type FileSlot = "front" | "back" | "list" | "summary";

export function fileKeyFor(orderId: string, slot: FileSlot, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 10) || "bin";
  return `${orderId}/${slot}.${safeExt}`;
}

export function extFromFileName(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx <= 0 || idx === fileName.length - 1) return "bin";
  return fileName.slice(idx + 1);
}

export function extFromMime(mime: string): string {
  switch (mime) {
    case "application/pdf":
      return "pdf";
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "text/csv":
    case "application/vnd.ms-excel":
      return "csv";
    default:
      return "bin";
  }
}

let bucketEnsured = false;

async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return;
  const admin = createAdminClient();
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) throw new Error(`Failed to list storage buckets: ${listError.message}`);
  if (!buckets?.some((b) => b.name === STORAGE_BUCKET)) {
    const { error: createError } = await admin.storage.createBucket(STORAGE_BUCKET, {
      public: false,
    });
    if (createError && !/already exists/i.test(createError.message)) {
      throw new Error(`Failed to create storage bucket: ${createError.message}`);
    }
  }
  bucketEnsured = true;
}

export async function uploadOrderFile(
  orderId: string,
  slot: FileSlot,
  file: { buffer: Buffer; mimeType: string; ext: string },
): Promise<string> {
  await ensureBucket();
  const key = fileKeyFor(orderId, slot, file.ext);
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(key, file.buffer, {
      contentType: file.mimeType,
      upsert: true,
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return key;
}

export async function getSignedUrl(key: string, expiresInSeconds = 60 * 60): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(key, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to sign URL for ${key}: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}

export async function removeOrderFiles(orderId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error: listError } = await admin.storage
    .from(STORAGE_BUCKET)
    .list(orderId);
  if (listError) throw new Error(`Failed to list order files: ${listError.message}`);
  if (!data || data.length === 0) return;
  const paths = data.map((f) => `${orderId}/${f.name}`);
  const { error } = await admin.storage.from(STORAGE_BUCKET).remove(paths);
  if (error) throw new Error(`Failed to remove order files: ${error.message}`);
}
