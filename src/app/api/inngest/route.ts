import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { ALL_INNGEST_FUNCTIONS } from "@/inngest/functions";

export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: ALL_INNGEST_FUNCTIONS,
});
