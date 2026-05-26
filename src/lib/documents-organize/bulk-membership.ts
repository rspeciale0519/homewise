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

export interface BulkMoveMoved {
  documentId: string;
  sortOrder: number | null;
}

export interface BulkMoveSkipped {
  documentId: string;
  reason: "already-member" | "not-in-source";
}

export interface BulkMoveResult {
  toCategoryId: string | null;
  moved: BulkMoveMoved[];
  skipped: BulkMoveSkipped[];
  failed: BulkAssignFailed[];
}

export interface BulkMoveRequest {
  toCategoryId: string | null;
  moves: Array<{ documentId: string; fromCategoryId: string }>;
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

export function bulkMoveMemberships(
  args: BulkMoveRequest,
): Promise<BulkMoveResult> {
  return adminFetch<BulkMoveResult>(
    "/api/admin/documents/memberships/bulk-move",
    {
      method: "POST",
      body: JSON.stringify(args),
    },
  );
}
