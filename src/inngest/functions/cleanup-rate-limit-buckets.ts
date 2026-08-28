import { inngest } from "../client";
import { cleanupExpiredRateLimitBuckets } from "@/lib/rate-limit/cleanup";

export const cleanupRateLimitBuckets = inngest.createFunction(
  { id: "cleanup-rate-limit-buckets", concurrency: { limit: 1 } },
  { cron: "15 * * * *" },
  async ({ step }) => {
    const deleted = await step.run(
      "delete-expired-rate-limit-buckets",
      () => cleanupExpiredRateLimitBuckets(),
    );

    return { deleted };
  },
);
