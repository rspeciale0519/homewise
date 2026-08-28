import { describe, expect, it } from "vitest";
import {
  createPropertyAlertConfirmationToken,
  createUnsubscribeToken,
  emailActionMatchesRecipient,
  EmailActionTokenError,
  verifyEmailActionToken,
} from "./action-token";

const SECRET = "test-email-action-secret-that-is-long-enough";
const NOW = Date.UTC(2026, 7, 27, 12, 0, 0);

describe("email action tokens", () => {
  it("creates a recipient-bound property alert confirmation token", () => {
    const token = createPropertyAlertConfirmationToken({
      alertId: "alert-1",
      email: "Buyer@Example.com",
      verificationVersion: 2,
    }, { now: NOW, secret: SECRET, ttlSeconds: 60 });

    const action = verifyEmailActionToken(token, "property_alert_confirmation", {
      now: NOW + 30_000,
      secret: SECRET,
    });

    expect(action).toMatchObject({
      purpose: "property_alert_confirmation",
      subjectId: "alert-1",
      verificationVersion: 2,
    });
    expect(emailActionMatchesRecipient(action, "buyer@example.com", SECRET)).toBe(true);
    expect(emailActionMatchesRecipient(action, "other@example.com", SECRET)).toBe(false);
  });

  it("rejects a changed token", () => {
    const token = createPropertyAlertConfirmationToken({
      alertId: "alert-1",
      email: "buyer@example.com",
      verificationVersion: 1,
    }, { now: NOW, secret: SECRET });
    const changed = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

    expect(() => verifyEmailActionToken(changed, "property_alert_confirmation", {
      now: NOW,
      secret: SECRET,
    })).toThrow(EmailActionTokenError);
  });

  it("rejects expired and wrong-purpose tokens", () => {
    const token = createPropertyAlertConfirmationToken({
      alertId: "alert-1",
      email: "buyer@example.com",
      verificationVersion: 1,
    }, { now: NOW, secret: SECRET, ttlSeconds: 60 });

    expect(() => verifyEmailActionToken(token, "property_alert_confirmation", {
      now: NOW + 60_000,
      secret: SECRET,
    })).toThrow(EmailActionTokenError);
    expect(() => verifyEmailActionToken(token, "unsubscribe", {
      now: NOW,
      secret: SECRET,
    })).toThrow(EmailActionTokenError);
  });

  it("creates a non-expiring unsubscribe token", () => {
    const token = createUnsubscribeToken(
      { kind: "saved_search", id: "search-1" },
      "buyer@example.com",
      { now: NOW, secret: SECRET },
    );

    const action = verifyEmailActionToken(token, "unsubscribe", {
      now: NOW + 20 * 365 * 24 * 60 * 60 * 1_000,
      secret: SECRET,
    });
    expect(action.target).toEqual({ kind: "saved_search", id: "search-1" });
    expect(emailActionMatchesRecipient(action, "buyer@example.com", SECRET)).toBe(true);
  });

  it("rejects oversized tokens and requires a strong secret", () => {
    expect(() => verifyEmailActionToken("x".repeat(2_049), "unsubscribe", {
      secret: SECRET,
    })).toThrow(EmailActionTokenError);
    expect(() => createUnsubscribeToken(
      { kind: "contact", id: "contact-1" },
      "buyer@example.com",
      { secret: "short" },
    )).toThrow("EMAIL_ACTION_SECRET must contain at least 32 bytes.");
    expect(() => createUnsubscribeToken(
      { kind: "contact", id: "contact-1" },
      "buyer@example.com",
      { secret: "replace-with-at-least-32-random-characters" },
    )).toThrow("EMAIL_ACTION_SECRET must contain at least 32 bytes.");
  });
});
