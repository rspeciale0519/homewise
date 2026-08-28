import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "node:crypto";
import { detectRasterImageType } from "@/lib/http/raster-image";

export const STORAGE_BUCKET = process.env.DIRECT_MAIL_STORAGE_BUCKET ?? "direct-mail-orders";

export type FileSlot = "summary" | "artwork" | "list";

const STORAGE_SEGMENT_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const FILE_ROW_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UPLOAD_ATTEMPT_PATTERN =
  /^upload-(?:artwork|list)-[A-Za-z0-9_-]{1,64}-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[1-9]\d*\.[a-z0-9]{1,10}$/i;
const SUBMITTED_PREFIX_PATTERN =
  /^submitted-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UploadAttempt = {
  attemptId: string;
  expectedByteSize: number;
};

export class DirectMailFileValidationError extends Error {
  readonly status: 400 | 413;

  constructor(message: string, status: 400 | 413 = 400) {
    super(message);
    this.name = "DirectMailFileValidationError";
    this.status = status;
  }
}

function safeExt(ext: string): string {
  return ext.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 10) || "bin";
}

function requireStorageSegment(value: string, label: string, pattern = STORAGE_SEGMENT_PATTERN): void {
  if (!pattern.test(value)) {
    throw new Error(`${label} contains unsupported characters`);
  }
}

function requirePositiveByteSize(byteSize: number): void {
  if (!Number.isSafeInteger(byteSize) || byteSize <= 0) {
    throw new Error("byteSize must be a positive safe integer");
  }
}

function uploadAttemptKeyFor(
  orderId: string,
  kind: "artwork" | "list",
  fileId: string,
  byteSize: number,
  ext: string,
  attemptId: string,
): string {
  requireStorageSegment(orderId, "orderId");
  requireStorageSegment(fileId, `${kind}Id`, FILE_ROW_ID_PATTERN);
  requirePositiveByteSize(byteSize);
  if (!UUID_PATTERN.test(attemptId)) throw new Error("attemptId must be a UUID");
  return `${orderId}/upload-${kind}-${fileId}-${attemptId}-${byteSize}.${safeExt(ext)}`;
}

function parseUploadAttemptKey(
  key: string,
  orderId: string,
  kind: "artwork" | "list",
  fileId: string,
  ext: string,
): UploadAttempt | null {
  if (!STORAGE_SEGMENT_PATTERN.test(orderId) || !FILE_ROW_ID_PATTERN.test(fileId)) return null;

  const prefix = `${orderId}/upload-${kind}-${fileId}-`;
  const suffix = `.${safeExt(ext)}`;
  if (!key.startsWith(prefix) || !key.endsWith(suffix)) return null;

  const encoded = key.slice(prefix.length, key.length - suffix.length);
  const sizeSeparator = encoded.lastIndexOf("-");
  if (sizeSeparator <= 0) return null;

  const attemptId = encoded.slice(0, sizeSeparator);
  const encodedSize = encoded.slice(sizeSeparator + 1);
  if (!UUID_PATTERN.test(attemptId) || !/^[1-9]\d*$/.test(encodedSize)) return null;

  const expectedByteSize = Number(encodedSize);
  if (!Number.isSafeInteger(expectedByteSize)) return null;
  return { attemptId, expectedByteSize };
}

export function artworkUploadAttemptKeyFor(
  orderId: string,
  artworkId: string,
  byteSize: number,
  ext: string,
  attemptId = randomUUID(),
): string {
  return uploadAttemptKeyFor(orderId, "artwork", artworkId, byteSize, ext, attemptId);
}

export function listUploadAttemptKeyFor(
  orderId: string,
  listId: string,
  byteSize: number,
  attemptId = randomUUID(),
): string {
  return uploadAttemptKeyFor(orderId, "list", listId, byteSize, "csv", attemptId);
}

export function parseArtworkUploadAttemptKey(
  key: string,
  orderId: string,
  artworkId: string,
  ext: string,
): UploadAttempt | null {
  return parseUploadAttemptKey(key, orderId, "artwork", artworkId, ext);
}

export function parseListUploadAttemptKey(
  key: string,
  orderId: string,
  listId: string,
): UploadAttempt | null {
  return parseUploadAttemptKey(key, orderId, "list", listId, "csv");
}

export function isUploadAttemptKeyForOrder(key: string, orderId: string): boolean {
  if (!STORAGE_SEGMENT_PATTERN.test(orderId)) return false;
  const prefix = `${orderId}/`;
  return key.startsWith(prefix) && UPLOAD_ATTEMPT_PATTERN.test(key.slice(prefix.length));
}

export function submittedPrefixFor(orderId: string, sealId = randomUUID()): string {
  requireStorageSegment(orderId, "orderId");
  if (!UUID_PATTERN.test(sealId)) throw new Error("sealId must be a UUID");
  return `${orderId}/submitted-${sealId}`;
}

export function submittedFileKeyFor(
  prefix: string,
  kind: "artwork" | "list" | "summary",
  fileId: string,
  ext: string,
): string {
  const segments = prefix.split("/");
  const orderId = segments[0] ?? "";
  const submittedSegment = segments[1] ?? "";
  if (
    segments.length !== 2 ||
    !STORAGE_SEGMENT_PATTERN.test(orderId) ||
    !SUBMITTED_PREFIX_PATTERN.test(submittedSegment)
  ) {
    throw new Error("Invalid submitted prefix");
  }
  requireStorageSegment(fileId, `${kind}Id`, FILE_ROW_ID_PATTERN);
  return `${prefix}-${kind}-${fileId}.${safeExt(ext)}`;
}

export function isSubmittedFileKeyForOrder(key: string, orderId: string): boolean {
  if (!STORAGE_SEGMENT_PATTERN.test(orderId)) return false;
  const prefix = `${orderId}/`;
  if (!key.startsWith(prefix)) return false;
  return /^submitted-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-(?:artwork|list|summary)-[A-Za-z0-9_-]{1,64}\.[a-z0-9]{1,10}$/i.test(
    key.slice(prefix.length),
  );
}

export function fileKeyFor(orderId: string, slot: "summary", ext: string): string {
  return `${orderId}/${slot}.${safeExt(ext)}`;
}

export function artworkFileKeyFor(orderId: string, artworkId: string, ext: string): string {
  const cleanId = artworkId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || "file";
  return `${orderId}/artwork-${cleanId}.${safeExt(ext)}`;
}

export function listFileKeyFor(orderId: string, listId: string): string {
  const cleanId = listId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || "file";
  return `${orderId}/list-${cleanId}.csv`;
}

export function filteredListFileKeyFor(orderId: string, listId: string): string {
  const cleanId = listId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || "file";
  return `${orderId}/list-${cleanId}-filtered.csv`;
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
  slot: "summary",
  file: { buffer: Buffer; mimeType: string; ext: string },
): Promise<string> {
  await ensureBucket();
  const key = fileKeyFor(orderId, slot, file.ext);
  return uploadAt(key, file);
}

export async function uploadAtKey(
  key: string,
  file: { buffer: Buffer; mimeType: string; ext: string },
): Promise<string> {
  await ensureBucket();
  return uploadAt(key, file, true);
}

export async function uploadCreateOnlyAtKey(
  key: string,
  file: { buffer: Buffer; mimeType: string },
): Promise<string> {
  await ensureBucket();
  return uploadAt(key, { ...file, ext: "bin" }, false);
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
  return uploadAt(destKey, { buffer: file.buffer, mimeType: file.mimeType, ext: "bin" }, true);
}

async function uploadAt(
  key: string,
  file: { buffer: Buffer; mimeType: string; ext: string },
  upsert = true,
): Promise<string> {
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(key, file.buffer, {
      contentType: file.mimeType,
      upsert,
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
    .createSignedUploadUrl(key, { upsert: false });
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

function objectByteSize(info: { size?: number }): number | null {
  if (Number.isSafeInteger(info.size) && (info.size ?? -1) >= 0) return info.size ?? null;
  return null;
}

export async function downloadObjectWithinLimit(
  key: string,
  maxBytes: number,
  expectedBytes?: number,
): Promise<{ buffer: Buffer; mimeType: string; byteSize: number }> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("maxBytes must be a positive safe integer");
  }
  if (expectedBytes !== undefined && (!Number.isSafeInteger(expectedBytes) || expectedBytes <= 0)) {
    throw new DirectMailFileValidationError("Expected file size is invalid.");
  }

  const admin = createAdminClient();
  const storage = admin.storage.from(STORAGE_BUCKET);
  const { data: info, error: infoError } = await storage.info(key);
  if (infoError || !info) {
    throw new Error(`Failed to inspect uploaded file: ${infoError?.message ?? "unknown"}`);
  }

  const byteSize = objectByteSize(info);
  if (byteSize === null) {
    throw new Error("Uploaded file size metadata is unavailable");
  }
  if (byteSize === 0) {
    throw new DirectMailFileValidationError("Uploaded file is empty.");
  }
  if (byteSize > maxBytes) {
    throw new DirectMailFileValidationError("Uploaded file exceeds the maximum size.", 413);
  }
  if (expectedBytes !== undefined && byteSize !== expectedBytes) {
    throw new DirectMailFileValidationError("Uploaded file size does not match the signed upload request.");
  }

  const { data, error } = await storage.download(key);
  if (error || !data) {
    throw new Error(`Failed to download uploaded file: ${error?.message ?? "unknown"}`);
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  if (buffer.byteLength !== byteSize) {
    throw new DirectMailFileValidationError("Uploaded file changed while it was being validated.");
  }
  if (buffer.byteLength > maxBytes) {
    throw new DirectMailFileValidationError("Uploaded file exceeds the maximum size.", 413);
  }

  return {
    buffer,
    mimeType: info.contentType || data.type || "application/octet-stream",
    byteSize,
  };
}

export function artworkContentError(buffer: Buffer, mimeType: string): string | null {
  switch (mimeType) {
    case "application/pdf":
      return buffer.subarray(0, 5).toString("ascii") === "%PDF-"
        ? null
        : "Uploaded file content is not a PDF.";
    case "image/png":
      return detectRasterImageType(buffer) === "image/png"
        ? null
        : "Uploaded file content is not a PNG.";
    case "image/jpeg":
    case "image/jpg":
      return detectRasterImageType(buffer) === "image/jpeg"
        ? null
        : "Uploaded file content is not a JPEG.";
    default:
      return "Uploaded file type is not supported.";
  }
}

export function fileNameMatchesMime(fileName: string, mime: string): boolean {
  const extension = extFromFileName(fileName).toLowerCase();
  if (mime === "image/jpeg" || mime === "image/jpg") {
    return extension === "jpg" || extension === "jpeg";
  }
  return extension === extFromMime(mime);
}

export function decodeCsvBuffer(buffer: Buffer): string {
  if (buffer.includes(0)) {
    throw new DirectMailFileValidationError("CSV contains binary data.");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new DirectMailFileValidationError("CSV must use UTF-8 text encoding.");
  }
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
  requireStorageSegment(orderId, "orderId");
  const admin = createAdminClient();
  const storage = admin.storage.from(STORAGE_BUCKET);
  const rootPrefix = `${orderId}/`;
  const paths = new Set<string>();
  const visitedPrefixes = new Set<string>();

  await collectObjectPaths(storage, orderId, rootPrefix, paths, visitedPrefixes);

  const allPaths = [...paths];
  const removeBatchSize = 100;
  for (let offset = 0; offset < allPaths.length; offset += removeBatchSize) {
    const batch = allPaths.slice(offset, offset + removeBatchSize);
    const { error } = await storage.remove(batch);
    if (error) throw new Error(`Failed to remove order files: ${error.message}`);
  }
}

type OrderStorageApi = ReturnType<ReturnType<typeof createAdminClient>["storage"]["from"]>;

type StorageListEntry = {
  name: string;
  id?: string | null;
  metadata?: Record<string, unknown> | null;
};

async function collectObjectPaths(
  storage: OrderStorageApi,
  prefix: string,
  rootPrefix: string,
  paths: Set<string>,
  visitedPrefixes: Set<string>,
): Promise<void> {
  if (visitedPrefixes.has(prefix)) return;
  visitedPrefixes.add(prefix);

  const pageSize = 100;
  let offset = 0;
  while (true) {
    const { data, error } = await storage.list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Failed to list order files: ${error.message}`);

    const entries = (data ?? []) as StorageListEntry[];
    for (const entry of entries) {
      const childPath = storageChildPath(prefix, entry.name, rootPrefix);
      if (entry.id == null && entry.metadata == null) {
        await collectObjectPaths(storage, childPath, rootPrefix, paths, visitedPrefixes);
      } else {
        paths.add(childPath);
      }
    }

    if (entries.length < pageSize) return;
    offset += entries.length;
  }
}

function storageChildPath(prefix: string, name: string, rootPrefix: string): string {
  if (
    name.length === 0 ||
    name.length > 1024 ||
    name === "." ||
    name === ".." ||
    name.includes("/") ||
    name.includes("\\") ||
    name.includes("\0")
  ) {
    throw new Error("Storage returned an invalid order file name");
  }

  const childPath = `${prefix}/${name}`;
  if (!childPath.startsWith(rootPrefix)) {
    throw new Error("Storage returned a path outside the order prefix");
  }
  return childPath;
}
