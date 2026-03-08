import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { createAdminClient } from "../src/lib/supabase/admin";

const BUCKET_NAME = "training-files";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/png",
  "image/jpeg",
] as const;

async function main() {
  const supabase = createAdminClient();

  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    console.error("Failed to list buckets:", listError.message);
    process.exit(1);
  }

  const exists = buckets.some((b) => b.name === BUCKET_NAME);

  if (exists) {
    console.log(`Bucket "${BUCKET_NAME}" already exists — skipping creation.`);
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(
    BUCKET_NAME,
    {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: [...ALLOWED_MIME_TYPES],
    },
  );

  if (createError) {
    console.error(`Failed to create bucket "${BUCKET_NAME}":`, createError.message);
    process.exit(1);
  }

  console.log(`Bucket "${BUCKET_NAME}" created successfully.`);
  console.log(`  - Public: false (files served via signed URLs)`);
  console.log(`  - Max file size: ${MAX_FILE_SIZE / (1024 * 1024)} MB`);
  console.log(`  - Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("Unexpected error:", message);
  process.exit(1);
});
