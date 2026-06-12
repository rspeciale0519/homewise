import { createAdminClient } from "../src/lib/supabase/admin";
async function main() {
  const admin = createAdminClient();
  const { data: buckets } = await admin.storage.listBuckets();
  if (buckets?.some((b) => b.name === "manual-listing-photos")) {
    console.log("bucket exists");
    return;
  }
  const { error } = await admin.storage.createBucket("manual-listing-photos", {
    public: true,
    fileSizeLimit: 8 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  console.log(error ? "ERROR: " + error.message : "bucket created");
}
main();
