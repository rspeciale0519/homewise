import { describe, expect, it } from "vitest";
import {
  MAX_BATCH,
  MAX_FILE_BYTES,
  UPLOAD_CONCURRENCY,
  nameFromFilename,
  validateFile,
  runWithConcurrency,
} from "./bulk-upload";

describe("constants", () => {
  it("are the agreed values", () => {
    expect(MAX_FILE_BYTES).toBe(25 * 1024 * 1024);
    expect(MAX_BATCH).toBe(50);
    expect(UPLOAD_CONCURRENCY).toBe(4);
  });
});

describe("nameFromFilename", () => {
  it("strips the last extension", () => {
    expect(nameFromFilename("Lease Agreement.pdf")).toBe("Lease Agreement");
  });
  it("keeps inner dots", () => {
    expect(nameFromFilename("report.final.docx")).toBe("report.final");
  });
  it("handles no extension", () => {
    expect(nameFromFilename("README")).toBe("README");
  });
  it("falls back to Untitled when empty", () => {
    expect(nameFromFilename("   ")).toBe("Untitled");
    expect(nameFromFilename(".pdf")).toBe("Untitled");
  });
});

describe("validateFile", () => {
  it("accepts an allowed type within size", () => {
    expect(
      validateFile({ name: "a.pdf", type: "application/pdf", size: 1000 }),
    ).toEqual({ ok: true });
  });
  it("rejects an unsupported extension", () => {
    expect(
      validateFile({ name: "a.exe", type: "application/pdf", size: 1 }).ok,
    ).toBe(false);
  });
  it("rejects an unsupported content type", () => {
    expect(
      validateFile({ name: "a.pdf", type: "text/x-evil", size: 1 }).ok,
    ).toBe(false);
  });
  it("rejects an oversized file", () => {
    expect(
      validateFile({
        name: "a.pdf",
        type: "application/pdf",
        size: MAX_FILE_BYTES + 1,
      }),
    ).toEqual({ ok: false, reason: "File exceeds 25 MB" });
  });
});

describe("runWithConcurrency", () => {
  it("runs all workers, caps concurrency, preserves order", async () => {
    let active = 0;
    let maxActive = 0;
    const work = async (n: number) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n * 2;
    };
    const out = await runWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, work);
    expect(out).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(maxActive).toBeLessThanOrEqual(3);
  });
  it("propagates a worker rejection (callers wrap workers to isolate)", async () => {
    const out = await runWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    }).catch(() => "THREW");
    expect(out).toBe("THREW");
  });
});
