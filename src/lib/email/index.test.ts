import { describe, expect, it } from "vitest";
import {
  buildEmailHtml,
  escapeHtml,
  escapeHtmlTokens,
  escapeHttpUrl,
  personalizeTemplate,
  sanitizeEmailSubject,
} from "./index";

describe("email helpers", () => {
  it("does not expand placeholders introduced by token values", () => {
    const result = personalizeTemplate(
      "Hi {{first_name}} {{listings_html}}",
      {
        first_name: "{{listings_html}}",
        listings_html: "<p>Trusted listings</p>",
      },
    );

    expect(result).toBe("Hi {{listings_html}} <p>Trusted listings</p>");
  });

  it("escapes text before interpolation into email HTML", () => {
    expect(escapeHtml(`<img src="x" onerror='alert(1)'>&`)).toBe(
      "&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;",
    );
  });

  it("replaces unsubscribe tokens added by the email wrapper", () => {
    const html = personalizeTemplate(buildEmailHtml("<p>Hello</p>"), {
      unsubscribe_url: "https://homewisefl.com/unsubscribe?token=signed-token",
    });

    expect(html).toContain(
      'href="https://homewisefl.com/unsubscribe?token=signed-token"',
    );
    expect(html).not.toContain("{{unsubscribe_url}}");
  });

  it("omits unsubscribe markup from transactional email wrappers", () => {
    const html = buildEmailHtml("<p>Reset your password</p>", undefined, false);

    expect(html).not.toContain("Unsubscribe");
    expect(html).not.toContain("{{unsubscribe_url}}");
  });

  it("escapes complete token maps", () => {
    expect(escapeHtmlTokens({ first_name: "<Rob>", count: "2" })).toEqual({
      first_name: "&lt;Rob&gt;",
      count: "2",
    });
  });

  it("accepts only escaped HTTP email links", () => {
    expect(escapeHttpUrl("https://example.com/a?x=1&y=2")).toBe(
      "https://example.com/a?x=1&amp;y=2",
    );
    expect(escapeHttpUrl("javascript:alert(1)")).toBe("");
    expect(escapeHttpUrl("not a URL")).toBe("");
  });

  it("removes subject controls and limits subject length", () => {
    const subject = sanitizeEmailSubject(`Hello\r\nBcc: victim@example.com ${"x".repeat(300)}`);

    expect(subject).not.toMatch(/[\r\n]/);
    expect(subject).toHaveLength(200);
  });
});
