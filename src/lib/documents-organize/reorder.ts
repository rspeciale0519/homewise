import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  OrganizeTree,
} from "@/app/admin/documents/types";

function moveArrayItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to) return arr.slice();
  const copy = arr.slice();
  const removed = copy.splice(from, 1);
  if (removed.length === 0) return copy;
  copy.splice(to, 0, removed[0]!);
  return copy;
}

export function computeCategoryReorder(
  categories: AdminCategoryTree[],
  fromIndex: number,
  toIndex: number,
): AdminCategoryTree[] {
  return moveArrayItem(categories, fromIndex, toIndex).map((c, i) => ({
    ...c,
    sortOrder: i,
  }));
}

export function computeDocReorder(
  docs: AdminDocumentInCategory[],
  fromIndex: number,
  toIndex: number,
): AdminDocumentInCategory[] {
  return moveArrayItem(docs, fromIndex, toIndex).map((d, i) => ({
    ...d,
    membership: { ...d.membership, sortOrder: i },
  }));
}

export function computeCrossCategoryMove(
  tree: OrganizeTree,
  documentId: string,
  fromCategoryId: string,
  toCategoryId: string,
  toIndex: number,
): OrganizeTree {
  const sectionKeys = Object.keys(tree.sections) as Array<
    keyof OrganizeTree["sections"]
  >;

  let movingDoc: AdminDocumentInCategory | undefined;
  for (const key of sectionKeys) {
    const fromCat = tree.sections[key].categories.find(
      (c) => c.id === fromCategoryId,
    );
    if (fromCat) {
      movingDoc = fromCat.documents.find((d) => d.id === documentId);
      if (movingDoc) break;
    }
  }
  if (!movingDoc) return tree;

  const updatedSections = { ...tree.sections };

  for (const key of sectionKeys) {
    const section = tree.sections[key];
    const hasFromCat = section.categories.some((c) => c.id === fromCategoryId);
    const hasToCat = section.categories.some((c) => c.id === toCategoryId);
    if (!hasFromCat && !hasToCat) continue;

    const updatedCategories = section.categories.map((cat) => {
      if (cat.id === fromCategoryId) {
        const remaining = cat.documents
          .filter((d) => d.id !== documentId)
          .map((d, i) => ({
            ...d,
            membership: { ...d.membership, sortOrder: i },
          }));
        return { ...cat, documents: remaining };
      }
      if (cat.id === toCategoryId) {
        const insert: AdminDocumentInCategory = {
          ...movingDoc!,
          membership: { categoryId: toCategoryId, sortOrder: toIndex },
        };
        const existingWithoutMoving = cat.documents.filter(
          (d) => d.id !== documentId,
        );
        const next = existingWithoutMoving.slice();
        next.splice(toIndex, 0, insert);
        const reindexed = next.map((d, i) => ({
          ...d,
          membership: { ...d.membership, sortOrder: i },
        }));
        return { ...cat, documents: reindexed };
      }
      return cat;
    });

    updatedSections[key] = { categories: updatedCategories };
  }

  return { sections: updatedSections };
}
