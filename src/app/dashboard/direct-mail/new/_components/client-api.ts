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

export async function uploadArtwork(
  orderId: string,
  artworkId: string,
  file: File,
): Promise<ArtworkUploadOutcome> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(
    `/api/direct-mail/upload/artwork?orderId=${encodeURIComponent(orderId)}&artworkId=${encodeURIComponent(artworkId)}`,
    { method: "POST", body: fd },
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? "Artwork upload failed");
  }
  return (await res.json()) as ArtworkUploadOutcome;
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
