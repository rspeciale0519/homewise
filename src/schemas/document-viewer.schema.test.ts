import { describe, expect, it } from "vitest";
import {
  annotationSchema,
  createSignatureSchema,
  exportSchema,
} from "./document-viewer.schema";

const pngData = "data:image/png;base64,aGVsbG8=";

describe("document viewer schemas", () => {
  it("accepts a bounded PNG signature", () => {
    expect(
      createSignatureSchema.safeParse({
        label: "Primary",
        imageData: pngData,
        source: "drawn",
      }).success,
    ).toBe(true);
  });

  it("rejects a non-PNG or malformed signature", () => {
    expect(
      createSignatureSchema.safeParse({
        label: "Primary",
        imageData: "data:image/svg+xml;base64,PHN2Zz4=",
        source: "uploaded",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid annotation colors and unbounded coordinates", () => {
    expect(
      annotationSchema.safeParse({
        id: "a1",
        pageIndex: 0,
        pdfX: Number.POSITIVE_INFINITY,
        pdfY: 20,
        type: "text",
        value: "Hello",
        color: "not-a-color",
      }).success,
    ).toBe(false);
  });

  it("rejects too many annotations", () => {
    const annotation = {
      id: "a1",
      pageIndex: 0,
      pdfX: 10,
      pdfY: 20,
      type: "text" as const,
      value: "Hello",
      color: "#000000",
    };

    expect(
      exportSchema.safeParse({
        documentPath: "document.pdf",
        annotations: Array.from({ length: 501 }, (_, index) => ({
          ...annotation,
          id: `a${index}`,
        })),
        action: "download",
      }).success,
    ).toBe(false);
  });
});
