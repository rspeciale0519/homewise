import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DOCUMENT_UPLOAD_LIMITS,
  AdminUploadStorageError,
  AdminUploadValidationError,
  createPendingAdminUploadKey,
  finalizeAdminUpload,
  isFinalAdminUploadKey,
  isPermittedAdminUploadPair,
  parseAdminUploadKey,
  type AdminUploadStorage,
} from "./admin-upload";

const PDF = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\nstartxref\n9\n%%EOF\n";

function storageFor(
  content: string,
  contentType = "application/pdf",
): AdminUploadStorage & {
  info: ReturnType<typeof vi.fn>;
  download: ReturnType<typeof vi.fn>;
  move: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
} {
  const byteSize = new TextEncoder().encode(content).byteLength;
  return {
    info: vi.fn().mockResolvedValue({
      data: { size: byteSize, contentType },
      error: null,
    }),
    download: vi.fn().mockResolvedValue({
      data: new Blob([content], { type: contentType }),
      error: null,
    }),
    move: vi.fn().mockResolvedValue({ data: {}, error: null }),
    remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };
}

function storedBytes(
  bytes: Uint8Array,
  contentType: string,
): ReturnType<typeof storageFor> {
  const storage = storageFor("", contentType);
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  storage.info.mockResolvedValue({
    data: { size: bytes.byteLength, contentType },
    error: null,
  });
  storage.download.mockResolvedValue({
    data: new Blob([arrayBuffer], { type: contentType }),
    error: null,
  });
  return storage;
}

function pushUint16(output: number[], value: number): void {
  output.push(value & 0xff, (value >>> 8) & 0xff);
}

function pushUint32(output: number[], value: number): void {
  output.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function officeZip(requiredPart: string): Uint8Array {
  const entries = [
    { name: "[Content_Types].xml", content: "<Types/>" },
    { name: requiredPart, content: "<document/>" },
  ];
  const local: number[] = [];
  const central: number[] = [];
  for (const entry of entries) {
    const name = [...entry.name].map((value) => value.charCodeAt(0));
    const content = [...entry.content].map((value) => value.charCodeAt(0));
    const localOffset = local.length;
    pushUint32(local, 0x04034b50);
    pushUint16(local, 20);
    pushUint16(local, 0);
    pushUint16(local, 0);
    pushUint16(local, 0);
    pushUint16(local, 0);
    pushUint32(local, 0);
    pushUint32(local, content.length);
    pushUint32(local, content.length);
    pushUint16(local, name.length);
    pushUint16(local, 0);
    local.push(...name, ...content);

    pushUint32(central, 0x02014b50);
    pushUint16(central, 20);
    pushUint16(central, 20);
    pushUint16(central, 0);
    pushUint16(central, 0);
    pushUint16(central, 0);
    pushUint16(central, 0);
    pushUint32(central, 0);
    pushUint32(central, content.length);
    pushUint32(central, content.length);
    pushUint16(central, name.length);
    pushUint16(central, 0);
    pushUint16(central, 0);
    pushUint16(central, 0);
    pushUint16(central, 0);
    pushUint32(central, 0);
    pushUint32(central, localOffset);
    central.push(...name);
  }

  const output = [...local, ...central];
  pushUint32(output, 0x06054b50);
  pushUint16(output, 0);
  pushUint16(output, 0);
  pushUint16(output, entries.length);
  pushUint16(output, entries.length);
  pushUint32(output, central.length);
  pushUint32(output, local.length);
  pushUint16(output, 0);
  return Uint8Array.from(output);
}

describe("admin upload metadata", () => {
  it.each([
    ["policy.pdf", "application/pdf", true],
    ["policy.pdf", "image/jpeg", false],
    ["photo.jpeg", "image/jpeg", true],
    ["photo.jpeg", "image/png", false],
    ["sheet.xlsx", "application/vnd.ms-excel", false],
  ] as const)("checks the extension and MIME pair for %s", (name, type, valid) => {
    expect(isPermittedAdminUploadPair(name, type)).toBe(valid);
  });

  it("encodes the signed byte size and only accepts trusted final prefixes", () => {
    const key = createPendingAdminUploadKey("policy.pdf", 123);
    expect(parseAdminUploadKey(key, "pending")).toMatchObject({
      byteSize: 123,
      extension: ".pdf",
    });
    expect(isFinalAdminUploadKey(key, "documents")).toBe(false);
    expect(
      isFinalAdminUploadKey(key.replace("pending/", "documents/"), "documents"),
    ).toBe(true);
  });
});

describe("finalizeAdminUpload", () => {
  it("validates content and moves the object to a trusted key", async () => {
    const storage = storageFor(PDF);
    const byteSize = new TextEncoder().encode(PDF).byteLength;
    const pendingKey = createPendingAdminUploadKey("policy.pdf", byteSize);

    const result = await finalizeAdminUpload(storage, {
      pendingKey,
      contentType: "application/pdf",
      byteSize,
      finalPrefix: "documents",
      limits: DOCUMENT_UPLOAD_LIMITS,
    });

    expect(result.fileKey).toBe(pendingKey.replace("pending/", "documents/"));
    expect(storage.move).toHaveBeenCalledWith(pendingKey, result.fileKey);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("accepts a bounded Office Open XML container with its required part", async () => {
    const bytes = officeZip("word/document.xml");
    const contentType =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const storage = storedBytes(bytes, contentType);
    const pendingKey = createPendingAdminUploadKey("policy.docx", bytes.byteLength);

    const result = await finalizeAdminUpload(storage, {
      pendingKey,
      contentType,
      byteSize: bytes.byteLength,
      finalPrefix: "documents",
      limits: DOCUMENT_UPLOAD_LIMITS,
    });

    expect(result.fileKey).toContain("documents/");
    expect(storage.move).toHaveBeenCalled();
  });

  it.each([
    {
      filename: "referral-agreement.pdf",
      contentType: "application/pdf",
      path: "private/documents/office/referral-agreement.pdf",
    },
    {
      filename: "letterhead.docx",
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      path: "private/documents/office/letterhead.docx",
    },
  ])("accepts the repository $filename fixture", async (fixture) => {
    const bytes = readFileSync(resolve(process.cwd(), fixture.path));
    const storage = storedBytes(bytes, fixture.contentType);
    const pendingKey = createPendingAdminUploadKey(
      fixture.filename,
      bytes.byteLength,
    );

    const result = await finalizeAdminUpload(storage, {
      pendingKey,
      contentType: fixture.contentType,
      byteSize: bytes.byteLength,
      finalPrefix: "documents",
      limits: DOCUMENT_UPLOAD_LIMITS,
    });

    expect(result.fileKey).toContain("documents/");
  });

  it("removes an object whose bytes do not match its extension", async () => {
    const content = "%PDF-1.7\ntruncated";
    const storage = storageFor(content);
    const byteSize = new TextEncoder().encode(content).byteLength;
    const pendingKey = createPendingAdminUploadKey("policy.pdf", byteSize);

    await expect(finalizeAdminUpload(storage, {
      pendingKey,
      contentType: "application/pdf",
      byteSize,
      finalPrefix: "documents",
      limits: DOCUMENT_UPLOAD_LIMITS,
    })).rejects.toMatchObject({ status: 415 });

    expect(storage.remove).toHaveBeenCalledWith([pendingKey]);
    expect(storage.move).not.toHaveBeenCalled();
  });

  it("removes an object when storage reports a different MIME type", async () => {
    const storage = storageFor(PDF, "image/jpeg");
    const byteSize = new TextEncoder().encode(PDF).byteLength;
    const pendingKey = createPendingAdminUploadKey("policy.pdf", byteSize);

    await expect(finalizeAdminUpload(storage, {
      pendingKey,
      contentType: "application/pdf",
      byteSize,
      finalPrefix: "documents",
      limits: DOCUMENT_UPLOAD_LIMITS,
    })).rejects.toMatchObject({ status: 415 });

    expect(storage.remove).toHaveBeenCalledWith([pendingKey]);
  });

  it("rejects the stored byte size before downloading an oversized object", async () => {
    const storage = storageFor(PDF);
    const byteSize = new TextEncoder().encode(PDF).byteLength;
    const pendingKey = createPendingAdminUploadKey("policy.pdf", byteSize);
    storage.info.mockResolvedValue({
      data: {
        size: DOCUMENT_UPLOAD_LIMITS[".pdf"] + 1,
        contentType: "application/pdf",
      },
      error: null,
    });

    await expect(finalizeAdminUpload(storage, {
      pendingKey,
      contentType: "application/pdf",
      byteSize,
      finalPrefix: "documents",
      limits: DOCUMENT_UPLOAD_LIMITS,
    })).rejects.toMatchObject({ status: 413 });

    expect(storage.download).not.toHaveBeenCalled();
    expect(storage.remove).toHaveBeenCalledWith([pendingKey]);
  });

  it("does not delete an object when the pending key is outside its namespace", async () => {
    const storage = storageFor(PDF);

    await expect(finalizeAdminUpload(storage, {
      pendingKey: "documents/existing-policy.pdf",
      contentType: "application/pdf",
      byteSize: 10,
      finalPrefix: "documents",
      limits: DOCUMENT_UPLOAD_LIMITS,
    })).rejects.toBeInstanceOf(AdminUploadValidationError);

    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("fails closed when rejected content cannot be removed", async () => {
    const content = "%PDF-1.7\ntruncated";
    const storage = storageFor(content);
    storage.remove.mockResolvedValue({
      data: null,
      error: { message: "remove unavailable" },
    });
    const byteSize = new TextEncoder().encode(content).byteLength;
    const pendingKey = createPendingAdminUploadKey("policy.pdf", byteSize);

    await expect(finalizeAdminUpload(storage, {
      pendingKey,
      contentType: "application/pdf",
      byteSize,
      finalPrefix: "documents",
      limits: DOCUMENT_UPLOAD_LIMITS,
    })).rejects.toBeInstanceOf(AdminUploadStorageError);
  });
});
