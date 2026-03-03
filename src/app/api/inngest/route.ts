import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { mlsSync } from "@/inngest/functions/mls-sync";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [mlsSync],
});
