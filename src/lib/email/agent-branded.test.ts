import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAgentBrandedEmailHtml } from "./agent-branded";

const baseAgent = {
  firstName: "Alex",
  lastName: "Morgan",
  email: "alex@example.com",
  phone: "+1 (407) 555-0100",
  photoUrl: "https://images.example.com/agent.jpg",
  emailSignature: "Here when you need me.",
  emailTagline: "Your Homewise FL Agent",
  brandColor: "#123abc",
};

describe("buildAgentBrandedEmailHtml", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("escapes agent fields while preserving trusted body HTML", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "javascript:alert(1)");
    const trustedBody = '<section data-safe="true"><strong>Trusted body</strong></section>';
    const html = buildAgentBrandedEmailHtml(
      trustedBody,
      {
        ...baseAgent,
        firstName: "<Alex>",
        lastName: 'Morgan" onmouseover="alert(1)',
        email: 'alex@example.com"><img src=x onerror=alert(1)>',
        phone: '+1"><svg onload=alert(1)>',
        photoUrl: "javascript:alert(1)",
        emailSignature: "<script>alert('signature')</script>",
        emailTagline: "<img src=x onerror=alert('tagline')>",
        brandColor: "#123456;background:url(javascript:alert(1))",
      },
      "<img src=x onerror=alert('preheader')>",
    );

    expect(html).toContain(trustedBody);
    expect(html).toContain("&lt;Alex&gt;");
    expect(html).toContain("Morgan&quot; onmouseover=&quot;alert(1)");
    expect(html).toContain("&lt;script&gt;alert(&#39;signature&#39;)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(&#39;tagline&#39;)&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(&#39;preheader&#39;)&gt;");
    expect(html).toContain("mailto:alex@example.com&quot;&gt;&lt;img");
    expect(html).toContain("tel:+1&quot;&gt;&lt;svg");
    expect(html).toContain("background:#1e293b");
    expect(html).not.toContain("background:url");
    expect(html).not.toContain('src="javascript:');
  });

  it("keeps valid colors and escapes safe HTTP image URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://homewisefl.com");
    const html = buildAgentBrandedEmailHtml("<p>Body</p>", {
      ...baseAgent,
      photoUrl: "https://images.example.com/agent.jpg?size=1&crop=face",
      brandColor: "#A1b2C3",
    });

    expect(html).toContain("background: #A1b2C3");
    expect(html).toContain(
      'src="https://images.example.com/agent.jpg?size=1&amp;crop=face"',
    );
    expect(html).toContain('src="https://homewisefl.com/logo.png"');
  });
});
