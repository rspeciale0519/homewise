import { createAdminClient } from "@/lib/supabase/admin";

export const STORAGE_BUCKET = process.env.DIRECT_MAIL_STORAGE_BUCKET ?? "direct-mail-orders";

export type FileSlot = "list" | "summary" | "artwork";

function safeExt(ext: string): string {
  return ext.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 10) || "bin";
}

export function fileKeyFor(orderId: string, slot: "list" | "summary", ext: string): string {
  return `${orderId}/${slot}.${safeExt(ext)}`;
}

export function artworkFileKeyFor(orderId: string, artworkId: string, ext: string): string {
  const cleanId = artworkId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || "file";
  return `${orderId}/artwork-${cleanId}.${safeExt(ext)}`;
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
    case "application/msword":
      return "doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
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
  slot: "list" | "summary",
  file: { buffer: Buffer; mimeType: string; ext: string },
): Promise<string> {
  await ensureBucket();
  const key = fileKeyFor(orderId, slot, file.ext);
  return uploadAt(key, file);
}

export async function uploadArtworkFile(
  orderId: string,
  artworkId: string,
  file: { buffer: Buffer; mimeType: string; ext: string },
): Promise<string> {
  await ensureBucket();
  const key = artworkFileKeyFor(orderId, artworkId, file.ext);
  return uploadAt(key, file);
}

export async function copyToKey(
  destKey: string,
  file: { buffer: Buffer; mimeType: string },
): Promise<string> {
  await ensureBucket();
  return uploadAt(destKey, { buffer: file.buffer, mimeType: file.mimeType, ext: "bin" });
}

async function uploadAt(
  key: string,
  file: { buffer: Buffer; mimeType: string; ext: string },
): Promise<string> {
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

export async function createSignedUploadUrl(
  key: string,
): Promise<{ signedUrl: string; token: string }> {
  await ensureBucket();
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(key, { upsert: true });
  if (error || !data) {
    throw new Error(`Failed to create signed upload URL: ${error?.message ?? "unknown"}`);
  }
  return { signedUrl: data.signedUrl, token: data.token };
}

export async function downloadObject(key: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(STORAGE_BUCKET).download(key);
  if (error || !data) {
    throw new Error(`Failed to download ${key}: ${error?.message ?? "unknown"}`);
  }
  const arr = await data.arrayBuffer();
  return { buffer: Buffer.from(arr), mimeType: data.type || "application/octet-stream" };
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const admin = createAdminClient();
  const { error } = await admin.storage.from(STORAGE_BUCKET).remove(keys);
  if (error) throw new Error(`Failed to delete objects: ${error.message}`);
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
