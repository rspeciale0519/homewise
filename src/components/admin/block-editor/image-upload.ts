import { adminFetch } from "@/lib/admin-fetch";

interface SignedUploadResponse {
  uploadUrl: string;
  fileKey: string;
}

/**
 * Upload an image picked from the block editor to Supabase Storage via
 * the existing /api/admin/training/upload signed-URL flow. Returns the
 * publicly servable storage URL (built from NEXT_PUBLIC_SUPABASE_URL +
 * the bucket path).
 *
 * Rejects when the file is not an image type allowed by the upload
 * endpoint (png / jpeg) so the caller can surface a clear error.
 */
export async function uploadEditorImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be inserted here");
  }

  const signed = await adminFetch<SignedUploadResponse>(
    "/api/admin/training/upload",
    {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    },
  );

  const put = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) {
    throw new Error(`Upload failed (${put.status})`);
  }

  return resolvePublicUrl(signed.fileKey);
}

function resolvePublicUrl(fileKey: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    // Fallback for E2E / SSR where the env var isn't wired — return a
    // relative-style key and let the caller compose a URL elsewhere.
    return fileKey;
  }
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/training-files/${fileKey}`;
}
