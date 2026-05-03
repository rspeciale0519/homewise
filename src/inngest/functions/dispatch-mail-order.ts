import { inngest } from "../client";
import { dispatchMailOrderOnce } from "@/lib/direct-mail/dispatch";

const MAX_ATTEMPTS = 3;
const BACKOFF_SECONDS = [30, 120, 300];

/**
 * Production dispatch path. Delegates to the shared dispatchMailOrderOnce
 * helper (also used by the inline-dev fallback) and adds Inngest retry
 * semantics: 3 attempts with backoff, surfacing the same dispatch logs on
 * each try.
 */
export const dispatchMailOrder = inngest.createFunction(
  { id: "dispatch-mail-order", retries: 0 },
  { event: "direct-mail/order.submitted" },
  async ({ event, step }) => {
    const { orderId } = event.data as { orderId: string };

    let lastError: string | null = null;
    let messageId: string | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const outcome = await step.run(`attempt-${attempt}`, async () => {
        return dispatchMailOrderOnce(orderId, "auto");
      });

      if (outcome.skipped) {
        return { skipped: true, reason: outcome.skipped };
      }
      if (outcome.success) {
        messageId = outcome.messageId;
        return { success: true, messageId, attempts: attempt };
      }
      lastError = outcome.error;

      if (attempt < MAX_ATTEMPTS) {
        const wait = BACKOFF_SECONDS[attempt - 1] ?? 60;
        await step.sleep(`backoff-${attempt}`, `${wait}s`);
      }
    }

    return { success: false, attempts: MAX_ATTEMPTS, lastError };
  },
);
