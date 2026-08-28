import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Thing, WithContext } from "schema-dts";
import { JsonLdScript, serializeJsonLd } from "./json-ld-script";

describe("JsonLdScript", () => {
  it("escapes values that can close the script element", () => {
    const payload = "</script><script>alert('stored-xss')</script>";
    const data = {
      "@context": "https://schema.org",
      "@type": "Thing",
      name: payload,
    } as WithContext<Thing>;

    const serialized = serializeJsonLd(data);
    const html = renderToStaticMarkup(<JsonLdScript data={data} />);

    expect(serialized).not.toContain("<");
    expect(html).not.toContain(payload);
    expect(html).not.toContain("<script>alert('stored-xss')</script>");
    expect(serialized).toContain("\\u003c/script\\u003e");
  });
});
