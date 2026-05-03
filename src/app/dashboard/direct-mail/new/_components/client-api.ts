import type { OrderDraftPatchInput } from "@/lib/direct-mail/schemas";
import type { ListUploadResult } from "@/lib/direct-mail/types";
import type { Workflow } from "@/lib/direct-mail/constants";

export type ArtworkUploadOutcome = {
  artworkId: string;
  fileKey: string;
  fileName: string;
  byteSize: number;
  mimeType: string;
  warnings: string[];
};

export async function createDraft(workflow: Workflow): Promise<{ id: string }> {
  const res = await fetch("/api/direct-mail/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? "Failed to create draft");
  }
  const json = (await res.json()) as { order: { id: string } };
  return { id: json.order.id };
}

export async function patchDraft(
  orderId: string,
  patch: OrderDraftPatchInput,
): Promise<void> {
  const res = await fetch(`/api/direct-mail/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? "Failed to save draft");
  }
}

export function uploadArtworkWithProgress(
  orderId: string,
  artworkId: string,
  file: File,
  onProgress: (pct: number) => void,
): { promise: Promise<ArtworkUploadOutcome>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<ArtworkUploadOutcome>((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as ArtworkUploadOutcome);
        } catch {
          reject(new Error("Server returned a non-JSON response."));
        }
      } else {
        let msg = `HTTP ${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText) as { error?: string };
          if (body.error) msg = body.error;
        } catch {
          /* fall through */
        }
        reject(new Error(msg));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted.")));

    xhr.open(
      "POST",
      `/api/direct-mail/upload/artwork?orderId=${encodeURIComponent(orderId)}&artworkId=${encodeURIComponent(artworkId)}`,
    );
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
  return { promise, abort: () => xhr.abort() };
}

export async function uploadList(orderId: string, file: File): Promise<ListUploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(
    `/api/direct-mail/upload/list?orderId=${encodeURIComponent(orderId)}`,
    { method: "POST", body: fd },
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? "List upload failed");
  }
  return (await res.json()) as ListUploadResult;
}
