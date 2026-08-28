import { detectRasterImageType } from "@/lib/http/raster-image";

export const ADMIN_UPLOAD_CONTENT_TYPES = {
  ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
} as const;

export type AdminUploadExtension = keyof typeof ADMIN_UPLOAD_CONTENT_TYPES;
export type AdminUploadLimits = Readonly<Record<AdminUploadExtension, number>>;

const MEBIBYTE = 1024 * 1024;

export const DOCUMENT_UPLOAD_LIMITS: AdminUploadLimits = {
  ".pdf": 25 * MEBIBYTE,
  ".xlsx": 25 * MEBIBYTE,
  ".xls": 25 * MEBIBYTE,
  ".docx": 25 * MEBIBYTE,
  ".doc": 25 * MEBIBYTE,
  ".png": 25 * MEBIBYTE,
  ".jpg": 25 * MEBIBYTE,
  ".jpeg": 25 * MEBIBYTE,
};

export const TRAINING_UPLOAD_LIMITS: AdminUploadLimits = {
  ".pdf": 25 * MEBIBYTE,
  ".xlsx": 10 * MEBIBYTE,
  ".xls": 10 * MEBIBYTE,
  ".docx": 10 * MEBIBYTE,
  ".doc": 10 * MEBIBYTE,
  ".png": 5 * MEBIBYTE,
  ".jpg": 5 * MEBIBYTE,
  ".jpeg": 5 * MEBIBYTE,
};

const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const SAFE_FILENAME_PATTERN = "[A-Za-z0-9._-]{1,255}";

type StorageError = { message?: string } | null;
type StorageObjectInfo = { size?: number; contentType?: string | null };

export interface AdminUploadStorage {
  info(path: string): Promise<{
    data: StorageObjectInfo | null;
    error: StorageError;
  }>;
  download(path: string): Promise<{ data: Blob | null; error: StorageError }>;
  move(fromPath: string, toPath: string): Promise<{
    data: unknown;
    error: StorageError;
  }>;
  remove(paths: string[]): Promise<{ data: unknown; error: StorageError }>;
}

export class AdminUploadValidationError extends Error {
  readonly status: 400 | 413 | 415;

  constructor(message: string, status: 400 | 413 | 415 = 400) {
    super(message);
    this.name = "AdminUploadValidationError";
    this.status = status;
  }
}

export class AdminUploadStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminUploadStorageError";
  }
}

export function getAdminUploadExtension(
  filename: string,
): AdminUploadExtension | null {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return null;
  const extension = filename.slice(lastDot).toLowerCase();
  return extension in ADMIN_UPLOAD_CONTENT_TYPES
    ? extension as AdminUploadExtension
    : null;
}

export function isPermittedAdminUploadPair(
  filename: string,
  contentType: string,
): boolean {
  const extension = getAdminUploadExtension(filename);
  return extension !== null &&
    ADMIN_UPLOAD_CONTENT_TYPES[extension] === normalizeContentType(contentType);
}

export function adminUploadLimitFor(
  filename: string,
  limits: AdminUploadLimits,
): number | null {
  const extension = getAdminUploadExtension(filename);
  return extension === null ? null : limits[extension];
}

export function createPendingAdminUploadKey(
  filename: string,
  byteSize: number,
): string {
  const sanitized = filename.replace(/[^A-Za-z0-9._-]/g, "_");
  return `pending/${crypto.randomUUID()}-${byteSize}-${sanitized}`;
}

type ParsedUploadKey = {
  byteSize: number;
  extension: AdminUploadExtension;
  filename: string;
};

export function parseAdminUploadKey(
  key: string,
  prefix: "pending" | "documents" | "training",
): ParsedUploadKey | null {
  const match = new RegExp(
    `^${prefix}\/(${UUID_PATTERN})-([1-9]\\d*)-(${SAFE_FILENAME_PATTERN})$`,
    "i",
  ).exec(key);
  if (!match) return null;

  const byteSize = Number(match[2]);
  const filename = match[3];
  if (!Number.isSafeInteger(byteSize) || filename === undefined) return null;
  const extension = getAdminUploadExtension(filename);
  return extension === null ? null : { byteSize, extension, filename };
}

export function isFinalAdminUploadKey(
  key: string,
  prefix: "documents" | "training",
): boolean {
  return parseAdminUploadKey(key, prefix) !== null;
}

export async function finalizeAdminUpload(
  storage: AdminUploadStorage,
  input: {
    pendingKey: string;
    contentType: string;
    byteSize: number;
    finalPrefix: "documents" | "training";
    limits: AdminUploadLimits;
  },
): Promise<{ fileKey: string; contentType: string; byteSize: number }> {
  const parsedKey = parseAdminUploadKey(input.pendingKey, "pending");
  if (!parsedKey || parsedKey.byteSize !== input.byteSize) {
    throw new AdminUploadValidationError("Invalid signed upload key.");
  }

  const expectedContentType = ADMIN_UPLOAD_CONTENT_TYPES[parsedKey.extension];
  if (normalizeContentType(input.contentType) !== expectedContentType) {
    await rejectPendingUpload(
      storage,
      input.pendingKey,
      new AdminUploadValidationError(
        "The filename extension does not match the content type.",
        415,
      ),
    );
  }

  const maxBytes = input.limits[parsedKey.extension];
  if (input.byteSize > maxBytes) {
    await rejectPendingUpload(
      storage,
      input.pendingKey,
      new AdminUploadValidationError("Uploaded file exceeds the maximum size.", 413),
    );
  }

  const { data: info, error: infoError } = await storage.info(input.pendingKey);
  if (infoError || !info) {
    throw new AdminUploadStorageError(
      `Failed to inspect uploaded file: ${infoError?.message ?? "unknown"}`,
    );
  }

  if (!Number.isSafeInteger(info.size) || (info.size ?? 0) <= 0) {
    await rejectPendingUpload(
      storage,
      input.pendingKey,
      new AdminUploadValidationError("Uploaded file is empty or has no size metadata."),
    );
  }
  if ((info.size ?? 0) > maxBytes) {
    await rejectPendingUpload(
      storage,
      input.pendingKey,
      new AdminUploadValidationError("Uploaded file exceeds the maximum size.", 413),
    );
  }
  if (info.size !== input.byteSize) {
    await rejectPendingUpload(
      storage,
      input.pendingKey,
      new AdminUploadValidationError(
        "Uploaded file size does not match the signed upload request.",
      ),
    );
  }
  if (normalizeContentType(info.contentType ?? "") !== expectedContentType) {
    await rejectPendingUpload(
      storage,
      input.pendingKey,
      new AdminUploadValidationError(
        "Uploaded file content type does not match the signed upload request.",
        415,
      ),
    );
  }

  const { data, error: downloadError } = await storage.download(input.pendingKey);
  if (downloadError || !data) {
    throw new AdminUploadStorageError(
      `Failed to download uploaded file: ${downloadError?.message ?? "unknown"}`,
    );
  }
  if (data.type && normalizeContentType(data.type) !== expectedContentType) {
    await rejectPendingUpload(
      storage,
      input.pendingKey,
      new AdminUploadValidationError(
        "Downloaded file content type does not match the signed upload request.",
        415,
      ),
    );
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (bytes.byteLength !== input.byteSize || bytes.byteLength > maxBytes) {
    await rejectPendingUpload(
      storage,
      input.pendingKey,
      new AdminUploadValidationError("Uploaded file changed during validation."),
    );
  }
  if (!contentMatchesExtension(bytes, parsedKey.extension)) {
    await rejectPendingUpload(
      storage,
      input.pendingKey,
      new AdminUploadValidationError(
        "Uploaded file content does not match its file type.",
        415,
      ),
    );
  }

  const fileKey = input.pendingKey.replace(/^pending\//, `${input.finalPrefix}/`);
  const { error: moveError } = await storage.move(input.pendingKey, fileKey);
  if (moveError) {
    throw new AdminUploadStorageError(
      `Failed to finalize uploaded file: ${moveError.message ?? "unknown"}`,
    );
  }

  return { fileKey, contentType: expectedContentType, byteSize: input.byteSize };
}

async function rejectPendingUpload(
  storage: AdminUploadStorage,
  pendingKey: string,
  validationError: AdminUploadValidationError,
): Promise<never> {
  const { error } = await storage.remove([pendingKey]);
  if (error) {
    throw new AdminUploadStorageError(
      `Failed to remove rejected upload: ${error.message ?? "unknown"}`,
    );
  }
  throw validationError;
}

function normalizeContentType(contentType: string): string {
  return contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function contentMatchesExtension(
  bytes: Uint8Array,
  extension: AdminUploadExtension,
): boolean {
  if (extension === ".pdf") return isPdf(bytes);
  if (extension === ".png") return detectRasterImageType(bytes) === "image/png";
  if (extension === ".jpg" || extension === ".jpeg") {
    return detectRasterImageType(bytes) === "image/jpeg";
  }
  if (extension === ".docx") return isOfficeOpenXml(bytes, "word/document.xml");
  if (extension === ".xlsx") return isOfficeOpenXml(bytes, "xl/workbook.xml");
  return isCompoundFileBinary(bytes);
}

function isPdf(bytes: Uint8Array): boolean {
  if (bytes.length < 24 || ascii(bytes, 0, 5) !== "%PDF-") return false;
  const tailStart = Math.max(0, bytes.length - 2048);
  const eofOffset = lastIndexOfAscii(bytes, "%%EOF", tailStart, bytes.length);
  if (
    eofOffset === -1 ||
    lastIndexOfAscii(bytes, "startxref", tailStart, eofOffset) === -1
  ) {
    return false;
  }
  for (let offset = eofOffset + 5; offset < bytes.length; offset += 1) {
    if (![0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20].includes(bytes[offset]!)) {
      return false;
    }
  }
  return true;
}

function isOfficeOpenXml(bytes: Uint8Array, requiredPart: string): boolean {
  if (bytes.length < 22) return false;
  const minimumEocdOffset = Math.max(0, bytes.length - 65_557);
  let eocdOffset = -1;
  for (let offset = bytes.length - 22; offset >= minimumEocdOffset; offset -= 1) {
    if (
      readUint32LittleEndian(bytes, offset) === 0x06054b50 &&
      offset + 22 + readUint16LittleEndian(bytes, offset + 20) === bytes.length
    ) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset === -1) return false;

  const diskNumber = readUint16LittleEndian(bytes, eocdOffset + 4);
  const centralDisk = readUint16LittleEndian(bytes, eocdOffset + 6);
  const diskEntries = readUint16LittleEndian(bytes, eocdOffset + 8);
  const totalEntries = readUint16LittleEndian(bytes, eocdOffset + 10);
  const centralSize = readUint32LittleEndian(bytes, eocdOffset + 12);
  const centralOffset = readUint32LittleEndian(bytes, eocdOffset + 16);
  if (
    diskNumber !== 0 ||
    centralDisk !== 0 ||
    diskEntries === 0 ||
    diskEntries !== totalEntries ||
    totalEntries === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff ||
    centralOffset + centralSize !== eocdOffset
  ) {
    return false;
  }

  let centralEntryOffset = centralOffset;
  let hasContentTypes = false;
  let hasRequiredPart = false;
  for (let entry = 0; entry < totalEntries; entry += 1) {
    if (
      centralEntryOffset + 46 > eocdOffset ||
      readUint32LittleEndian(bytes, centralEntryOffset) !== 0x02014b50
    ) {
      return false;
    }
    const flags = readUint16LittleEndian(bytes, centralEntryOffset + 8);
    const compression = readUint16LittleEndian(bytes, centralEntryOffset + 10);
    const compressedSize = readUint32LittleEndian(bytes, centralEntryOffset + 20);
    const uncompressedSize = readUint32LittleEndian(bytes, centralEntryOffset + 24);
    const filenameLength = readUint16LittleEndian(bytes, centralEntryOffset + 28);
    const extraLength = readUint16LittleEndian(bytes, centralEntryOffset + 30);
    const commentLength = readUint16LittleEndian(bytes, centralEntryOffset + 32);
    const localOffset = readUint32LittleEndian(bytes, centralEntryOffset + 42);
    const entryEnd = centralEntryOffset + 46 + filenameLength + extraLength + commentLength;
    if (
      filenameLength === 0 ||
      entryEnd > eocdOffset ||
      (flags & 1) !== 0 ||
      (compression !== 0 && compression !== 8) ||
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localOffset + 30 > centralOffset ||
      readUint32LittleEndian(bytes, localOffset) !== 0x04034b50
    ) {
      return false;
    }

    const filename = ascii(
      bytes,
      centralEntryOffset + 46,
      centralEntryOffset + 46 + filenameLength,
    );
    if (
      filename.includes("\\") ||
      filename.startsWith("/") ||
      filename.split("/").includes("..")
    ) {
      return false;
    }
    if (filename === "[Content_Types].xml") hasContentTypes = true;
    if (filename === requiredPart) hasRequiredPart = true;

    const localFilenameLength = readUint16LittleEndian(bytes, localOffset + 26);
    const localExtraLength = readUint16LittleEndian(bytes, localOffset + 28);
    const dataOffset = localOffset + 30 + localFilenameLength + localExtraLength;
    const localFilename = ascii(
      bytes,
      localOffset + 30,
      localOffset + 30 + localFilenameLength,
    );
    if (
      localFilename !== filename ||
      dataOffset + compressedSize > centralOffset ||
      ((filename === "[Content_Types].xml" || filename === requiredPart) &&
        uncompressedSize === 0)
    ) {
      return false;
    }
    centralEntryOffset = entryEnd;
  }

  return centralEntryOffset === eocdOffset && hasContentTypes && hasRequiredPart;
}

function isCompoundFileBinary(bytes: Uint8Array): boolean {
  if (
    bytes.length < 1_536 ||
    !startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) ||
    readUint16LittleEndian(bytes, 28) !== 0xfffe ||
    readUint16LittleEndian(bytes, 32) !== 6
  ) {
    return false;
  }
  const sectorShift = readUint16LittleEndian(bytes, 30);
  if (sectorShift !== 9 && sectorShift !== 12) return false;
  const sectorSize = 2 ** sectorShift;
  const sectorCount = (bytes.length - 512) / sectorSize;
  const fatSectorCount = readUint32LittleEndian(bytes, 44);
  const firstDirectorySector = readUint32LittleEndian(bytes, 48);
  return Number.isInteger(sectorCount) &&
    sectorCount > 0 &&
    fatSectorCount > 0 &&
    fatSectorCount <= sectorCount &&
    firstDirectorySector < sectorCount &&
    readUint32LittleEndian(bytes, 56) === 4096;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let value = "";
  for (let offset = start; offset < end; offset += 1) {
    const byte = bytes[offset];
    if (byte === undefined || byte > 0x7f || byte === 0) return "";
    value += String.fromCharCode(byte);
  }
  return value;
}

function lastIndexOfAscii(
  bytes: Uint8Array,
  needle: string,
  start: number,
  end: number,
): number {
  for (let offset = end - needle.length; offset >= start; offset -= 1) {
    let matches = true;
    for (let index = 0; index < needle.length; index += 1) {
      if (bytes[offset + index] !== needle.charCodeAt(index)) {
        matches = false;
        break;
      }
    }
    if (matches) return offset;
  }
  return -1;
}

function readUint16LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! + (bytes[offset + 1]! * 0x100);
}

function readUint32LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! +
    (bytes[offset + 1]! * 0x100) +
    (bytes[offset + 2]! * 0x10000) +
    (bytes[offset + 3]! * 0x1000000);
}
