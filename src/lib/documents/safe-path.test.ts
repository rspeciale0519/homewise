import path from "path";
import { describe, expect, it } from "vitest";
import { resolveContainedPath } from "./safe-path";

describe("resolveContainedPath", () => {
  const root = path.resolve("private", "documents");

  it("resolves a nested document inside the document directory", () => {
    expect(resolveContainedPath(root, "office/form.pdf")).toBe(
      path.resolve(root, "office", "form.pdf"),
    );
  });

  it("rejects traversal and absolute paths", () => {
    expect(resolveContainedPath(root, "../secret.pdf")).toBeNull();
    expect(resolveContainedPath(root, path.resolve("secret.pdf"))).toBeNull();
  });

  it("rejects a sibling directory that shares the document prefix", () => {
    expect(resolveContainedPath(root, "../documents-private/secret.pdf")).toBeNull();
  });

  it("rejects the document directory itself and null bytes", () => {
    expect(resolveContainedPath(root, ".")).toBeNull();
    expect(resolveContainedPath(root, "office/form.pdf\0.txt")).toBeNull();
  });
});
