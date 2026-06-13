import { describe, expect, it } from "vitest";
import { sanitizeRichHtml } from "./sanitize-rich-html";

describe("sanitizeRichHtml", () => {
  it("preserves typical TipTap rich formatting", () => {
    const input =
      '<h2>Title</h2><p>Hello <strong>bold</strong> and <em>italic</em> and <a href="https://example.com">link</a>.</p>' +
      "<ul><li>one</li><li>two</li></ul><blockquote>quote</blockquote>";
    const out = sanitizeRichHtml(input);
    expect(out).toContain("<h2>Title</h2>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>italic</em>");
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain("<li>one</li>");
    expect(out).toContain("<blockquote>quote</blockquote>");
  });

  it("keeps images with https/data src", () => {
    expect(sanitizeRichHtml('<img src="https://cdn.example.com/a.jpg" alt="a">')).toContain(
      'src="https://cdn.example.com/a.jpg"',
    );
  });

  it("strips script tags and event handlers", () => {
    const out = sanitizeRichHtml('<p onclick="evil()">hi</p><script>steal()</script>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("onclick");
    expect(out).toContain("hi");
  });

  it("removes javascript: URLs", () => {
    const out = sanitizeRichHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
  });

  it("adds rel=noopener to links", () => {
    expect(sanitizeRichHtml('<a href="https://x.com">x</a>')).toContain("noopener");
  });

  it("returns a string for empty input", () => {
    expect(sanitizeRichHtml("")).toBe("");
  });
});
