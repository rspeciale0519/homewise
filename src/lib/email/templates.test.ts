import { describe, expect, it } from "vitest";
import {
  adminUserWelcomeEmail,
  agentApplicationAdminNotificationEmail,
  agentApplicationApprovedEmail,
  agentApplicationRejectedEmail,
  passwordResetEmail,
} from "./templates";

describe("transactional email templates", () => {
  it("escapes names and accepts only HTTP action URLs", () => {
    const welcome = adminUserWelcomeEmail(
      "<Admin>",
      "https://example.com/setup?first=1&second=2",
    );
    const unsafeEmails = [
      passwordResetEmail("<Buyer>", "javascript:alert(1)"),
      agentApplicationAdminNotificationEmail(
        {
          firstName: "Alex",
          lastName: "Morgan",
          email: "alex@example.com",
        },
        "javascript:alert(1)",
      ),
      agentApplicationApprovedEmail("<Agent>", "javascript:alert(1)"),
    ];

    expect(welcome.html).toContain("Welcome, &lt;Admin&gt;!");
    expect(welcome.html).toContain(
      'href="https://example.com/setup?first=1&amp;second=2"',
    );
    expect(welcome.html).not.toContain("{{unsubscribe_url}}");
    for (const email of unsafeEmails) {
      expect(email.html).toContain('href="" class="btn"');
      expect(email.html).not.toContain("javascript:");
      expect(email.html).not.toContain("{{unsubscribe_url}}");
    }
  });

  it("sanitizes application subjects and escapes applicant content", () => {
    const email = agentApplicationAdminNotificationEmail(
      {
        firstName: `Alex\r\nBcc: victim@example.com ${"x".repeat(250)}`,
        lastName: "<script>alert(1)</script>",
        email: 'alex@example.com"><img src=x onerror=alert(1)>',
        phone: "<svg onload=alert(1)>",
        message: "<script>alert('message')</script>",
      },
      "https://example.com/review?id=1&source=email",
    );

    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.subject).toHaveLength(200);
    expect(email.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(email.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(email.html).toContain("&lt;svg onload=alert(1)&gt;");
    expect(email.html).toContain("&lt;script&gt;alert(&#39;message&#39;)&lt;/script&gt;");
    expect(email.html).toContain(
      'href="https://example.com/review?id=1&amp;source=email"',
    );
    expect(email.html).not.toContain("<script>alert");
  });

  it("escapes rejection notes", () => {
    const email = agentApplicationRejectedEmail(
      "<Applicant>",
      "<img src=x onerror=alert(1)>",
    );

    expect(email.html).toContain("Hi &lt;Applicant&gt;,");
    expect(email.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(email.html).not.toContain("<img src=x");
  });
});
