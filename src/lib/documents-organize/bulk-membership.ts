import { adminFetch } from "@/lib/admin-fetch";

export interface BulkAssignAssigned {
  documentId: string;
  sortOrder: number;
}

export interface BulkAssignSkipped {
  documentId: string;
  reason: "already-member";
}

export interface BulkAssignFailed {
  documentId: string;
  error: string;
}

export interface BulkAssignResult {
  categoryId: string;
  assigned: BulkAssignAssigned[];
  skipped: BulkAssignSkipped[];
  failed: BulkAssignFailed[];
}

export interface BulkUnassignResult {
  categoryId: string;
  removed: string[];
  failed: BulkAssignFailed[];
}

export function bulkAssignMemberships(args: {
  categoryId: string;
  documentIds: string[];
}): Promise<BulkAssignResult> {
  return adminFetch<BulkAssignResult>(
    "/api/admin/documents/memberships/bulk-assign",
    {
      method: "POST",
      body: JSON.stringify(args),
    },
  );
}

export function bulkUnassignMemberships(args: {
  categoryId: string;
  documentIds: string[];
}): Promise<BulkUnassignResult> {
  return adminFetch<BulkUnassignResult>(
    "/api/admin/documents/memberships/bulk-unassign",
    {
      method: "POST",
      body: JSON.stringify(args),
    },
  );
}
