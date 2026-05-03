import type { OrderDraftPatchInput } from "@/lib/direct-mail/schemas";
import type { ListUploadOutcome } from "@/lib/direct-mail/types";
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

export type ArtworkUploadCallbacks = {
  onProgress: (pct: number) => void;
  onUploadComplete: () => void;
};

export function uploadArtworkWithProgress(
  orderId: string,
  artworkId: string,
  file: File,
  callbacks: ArtworkUploadCallbacks,
): { promise: Promise<ArtworkUploadOutcome>; abort: () => void } {
  let activeXhr: XMLHttpRequest | null = null;
  const promise = (async (): Promise<ArtworkUploadOutcome> => {
    const sign = await fetchJson<{ fileKey: string; signedUrl: string; token: string }>(
      "/api/direct-mail/upload/artwork/sign",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          artworkId,
          fileName: file.name,
          mimeType: file.type,
          byteSize: file.size,
        }),
      },
    );

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      activeXhr = xhr;
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          callbacks.onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          callbacks.onProgress(100);
          resolve();
        } else {
          reject(new Error(parseXhrError(xhr) ?? `Storage upload failed (HTTP ${xhr.status}).`));
        }
      });
      xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
      xhr.addEventListener("abort", () => reject(new Error("Upload aborted.")));
      xhr.open("PUT", sign.signedUrl);
      if (file.type) xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });

    callbacks.onUploadComplete();

    const finalized = await fetchJson<ArtworkUploadOutcome>(
      "/api/direct-mail/upload/artwork/finalize",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          artworkId,
          fileKey: sign.fileKey,
          fileName: file.name,
          byteSize: file.size,
          mimeType: file.type,
        }),
      },
    );
    return { ...finalized, artworkId };
  })();
  return { promise, abort: () => activeXhr?.abort() };
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      /* fall through */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

function parseXhrError(xhr: XMLHttpRequest): string | null {
  try {
    const body = JSON.parse(xhr.responseText) as { error?: string; message?: string };
    return body.error ?? body.message ?? null;
  } catch {
    return xhr.responseText?.slice(0, 200) || null;
  }
}

export function uploadListWithProgress(
  orderId: string,
  listId: string,
  file: File,
  callbacks: ArtworkUploadCallbacks,
): { promise: Promise<ListUploadOutcome>; abort: () => void } {
  let activeXhr: XMLHttpRequest | null = null;
  const promise = (async (): Promise<ListUploadOutcome> => {
    const sign = await fetchJson<{ fileKey: string; signedUrl: string; token: string }>(
      "/api/direct-mail/upload/list/sign",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          listId,
          fileName: file.name,
          mimeType: file.type || "text/csv",
          byteSize: file.size,
        }),
      },
    );

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      activeXhr = xhr;
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          callbacks.onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          callbacks.onProgress(100);
          resolve();
        } else {
          reject(new Error(parseXhrError(xhr) ?? `Storage upload failed (HTTP ${xhr.status}).`));
        }
      });
      xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
      xhr.addEventListener("abort", () => reject(new Error("Upload aborted.")));
      xhr.open("PUT", sign.signedUrl);
      xhr.setRequestHeader("Content-Type", file.type || "text/csv");
      xhr.send(file);
    });

    callbacks.onUploadComplete();

    const finalized = await fetchJson<ListUploadOutcome>(
      "/api/direct-mail/upload/list/finalize",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          listId,
          fileKey: sign.fileKey,
          fileName: file.name,
          byteSize: file.size,
        }),
      },
    );
    return { ...finalized, listId };
  })();
  return { promise, abort: () => activeXhr?.abort() };
}
