import { adminFetch } from "@/lib/admin-fetch";
import type {
  DocumentSection,
  OrganizeTree,
} from "@/app/admin/documents/types";

export function fetchOrganizeTree(): Promise<OrganizeTree> {
  return adminFetch<OrganizeTree>("/api/admin/documents/organize");
}

export function reorderCategories(
  section: DocumentSection,
  categoryIds: string[],
): Promise<{ ok: true }> {
  return adminFetch("/api/admin/documents/categories/reorder", {
    method: "PATCH",
    body: JSON.stringify({ section, categoryIds }),
  });
}

export function reorderMemberships(
  categoryId: string,
  documentIds: string[],
): Promise<{ ok: true }> {
  return adminFetch("/api/admin/documents/memberships/reorder", {
    method: "PATCH",
    body: JSON.stringify({ categoryId, documentIds }),
  });
}

export function moveMembership(args: {
  documentId: string;
  fromCategoryId: string;
  toCategoryId: string;
  toIndex: number;
}): Promise<{ ok: true }> {
  return adminFetch("/api/admin/documents/memberships/move", {
    method: "PATCH",
    body: JSON.stringify(args),
  });
}
