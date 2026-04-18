import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const supabase = createAdminClient();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Failed to list buckets:", error.message);
    process.exit(1);
  }
  console.log("Existing buckets:");
  for (const b of buckets) {
    console.log(`  - ${b.name} (public=${b.public})`);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("Unexpected error:", message);
  process.exit(1);
});
