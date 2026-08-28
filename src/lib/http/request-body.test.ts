import { describe, expect, it } from "vitest";
import {
  InvalidJsonBodyError,
  InvalidFormDataBodyError,
  InvalidTextBodyError,
  readFormDataBodyWithLimit,
  readJsonBodyWithLimit,
  readTextBodyWithLimit,
  RequestBodyTooLargeError,
} from "./request-body";

describe("readJsonBodyWithLimit", () => {
  it("parses a JSON body below the byte limit", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify({ value: "ok" }),
    });

    await expect(readJsonBodyWithLimit(request, 100)).resolves.toEqual({
      value: "ok",
    });
  });

  it("rejects an oversized body without a content-length header", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"value":"'));
        controller.enqueue(encoder.encode('too large"}'));
        controller.close();
      },
    });
    const request = new Request("https://example.test", {
      method: "POST",
      body,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readJsonBodyWithLimit(request, 12)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it("rejects invalid JSON", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      body: "not-json",
    });

    await expect(readJsonBodyWithLimit(request, 100)).rejects.toBeInstanceOf(
      InvalidJsonBodyError,
    );
  });
});

describe("readTextBodyWithLimit", () => {
  it("returns the exact UTF-8 request text", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      body: "signed=raw%20body&value=%2B1",
    });

    await expect(readTextBodyWithLimit(request, 100)).resolves.toBe(
      "signed=raw%20body&value=%2B1",
    );
  });

  it("rejects an oversized text body", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      body: "too large",
    });

    await expect(readTextBodyWithLimit(request, 4)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it("rejects invalid UTF-8 text", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      body: new Uint8Array([0xc3, 0x28]),
    });

    await expect(readTextBodyWithLimit(request, 10)).rejects.toBeInstanceOf(
      InvalidTextBodyError,
    );
  });
});

describe("readFormDataBodyWithLimit", () => {
  it("parses multipart form data below the byte limit", async () => {
    const boundary = "test-boundary";
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="photo.jpg"',
      "Content-Type: image/jpeg",
      "",
      "image",
      `--${boundary}--`,
      "",
    ].join("\r\n");
    const request = new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      body,
    });

    const parsed = await readFormDataBodyWithLimit(request, 10_000);

    expect((parsed.get("file") as File).name).toBe("photo.jpg");
  });

  it("rejects oversized multipart data before parsing", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=test" },
      body: "a body that is too large",
    });

    await expect(readFormDataBodyWithLimit(request, 10)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it("rejects malformed form data", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=missing" },
      body: "not-a-valid-multipart-body",
    });

    await expect(readFormDataBodyWithLimit(request, 100)).rejects.toBeInstanceOf(
      InvalidFormDataBodyError,
    );
  });
});
