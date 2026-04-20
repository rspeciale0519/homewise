import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  DocumentCategoryItem,
  DocumentItem,
  OrganizeTree,
} from "@/app/admin/documents/types";

export function documentToItem(
  doc: AdminDocumentInCategory,
  allCategories: AdminCategoryTree[],
): DocumentItem {
  const docCats = allCategories
    .filter((c) => c.documents.some((d) => d.id === doc.id))
    .map((c) => ({ id: c.id, title: c.title, section: c.section }));
  return {
    id: doc.id,
    slug: doc.slug,
    name: doc.name,
    description: doc.description,
    url: doc.url,
    external: doc.external,
    storageKey: doc.storageKey,
    storageProvider: doc.storageProvider,
    mimeType: doc.mimeType,
    sizeBytes: null,
    sortOrder: 0,
    published: doc.published,
    quickAccess: doc.quickAccess,
    createdAt: "",
    updatedAt: "",
    categories: docCats,
  };
}

export function categoryToItem(c: AdminCategoryTree): DocumentCategoryItem {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    section: c.section,
    sortOrder: c.sortOrder,
    documentCount: c.documents.length,
  };
}

export function allCategoriesOfTree(
  tree: OrganizeTree,
): AdminCategoryTree[] {
  return [
    ...tree.sections.office.categories,
    ...tree.sections.listing.categories,
    ...tree.sections.sales.categories,
  ];
}
