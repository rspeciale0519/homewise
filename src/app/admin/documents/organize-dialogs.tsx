"use client";

import { DocumentDrawer } from "@/components/admin/document-drawer";
import { DocumentCategoryDrawer } from "@/components/admin/document-category-drawer";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { BulkDeleteDialog } from "./bulk-delete-dialog";
import { BulkUploadDialog } from "./bulk-upload-dialog";
import { CategoryPickerDialog } from "./category-picker-dialog";
import type { BulkDeleteResult } from "@/lib/documents/bulk-delete";
import type { BulkCreateResult } from "@/lib/documents/bulk-upload";
import type {
  AdminCategoryTree,
  DocumentCategoryItem,
  DocumentItem,
  DocumentSection,
} from "./types";

interface OrganizeDialogsProps {
  docDrawerOpen: boolean;
  setDocDrawerOpen: (open: boolean) => void;
  editingDoc: DocumentItem | null;
  setEditingDoc: (doc: DocumentItem | null) => void;
  drawerCategories: DocumentCategoryItem[];
  addDocSection: DocumentSection;
  catDrawerOpen: boolean;
  setCatDrawerOpen: (open: boolean) => void;
  editingCat: DocumentCategoryItem | null;
  setEditingCat: (cat: DocumentCategoryItem | null) => void;
  pendingDelete: { id: string; name: string } | null;
  deleting: boolean;
  confirmDelete: () => void;
  setPendingDelete: (value: { id: string; name: string } | null) => void;
  bulkOpen: boolean;
  setBulkOpen: (open: boolean) => void;
  handleBulkDeleted: (result: BulkDeleteResult) => void;
  refetch: () => void;
  bulkUploadOpen: boolean;
  setBulkUploadOpen: (open: boolean) => void;
  handleBulkUploaded: (result: BulkCreateResult) => void;
  pickerOpen: boolean;
  pickerSection?: DocumentSection;
  pickerDocumentCount: number;
  sectionsToCategories: Record<DocumentSection, AdminCategoryTree[]>;
  onPickerCancel: () => void;
  onPickerConfirm: (args: {
    section: DocumentSection;
    categoryId: string;
    categoryTitle: string;
  }) => void;
}

export function OrganizeDialogs({
  docDrawerOpen,
  setDocDrawerOpen,
  editingDoc,
  setEditingDoc,
  drawerCategories,
  addDocSection,
  catDrawerOpen,
  setCatDrawerOpen,
  editingCat,
  setEditingCat,
  pendingDelete,
  deleting,
  confirmDelete,
  setPendingDelete,
  bulkOpen,
  setBulkOpen,
  handleBulkDeleted,
  refetch,
  bulkUploadOpen,
  setBulkUploadOpen,
  handleBulkUploaded,
  pickerOpen,
  pickerSection,
  pickerDocumentCount,
  sectionsToCategories,
  onPickerCancel,
  onPickerConfirm,
}: OrganizeDialogsProps) {
  return (
    <>
      <DocumentDrawer
        open={docDrawerOpen}
        onClose={() => {
          setDocDrawerOpen(false);
          setEditingDoc(null);
        }}
        item={editingDoc}
        categories={drawerCategories}
        onSaved={refetch}
        defaultSection={addDocSection}
      />

      <DocumentCategoryDrawer
        open={catDrawerOpen}
        onClose={() => {
          setCatDrawerOpen(false);
          setEditingCat(null);
        }}
        item={editingCat}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete Document"
        message={
          pendingDelete
            ? `This will permanently delete "${pendingDelete.name}" and its file. Agent favorites and drafts that reference this document will remain but show as missing. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete permanently"
        typeToConfirm="DELETE"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />

      <BulkDeleteDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onDeleted={handleBulkDeleted}
        categories={drawerCategories.map((c) => ({
          id: c.id,
          title: c.title,
          section: c.section,
        }))}
      />

      <BulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onUploaded={handleBulkUploaded}
      />

      <CategoryPickerDialog
        key={pickerOpen ? `${pickerSection ?? "any"}-${pickerDocumentCount}` : "closed"}
        open={pickerOpen}
        documentCount={pickerDocumentCount}
        sectionsToCategories={sectionsToCategories}
        section={pickerSection}
        onCancel={onPickerCancel}
        onConfirm={onPickerConfirm}
      />
    </>
  );
}
