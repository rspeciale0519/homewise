import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  AdminUncategorizedDoc,
  OrganizeTree,
} from "@/app/admin/documents/types";
import {
  inCategoryToUncategorized,
  uncategorizedToInCategory,
} from "./shapers";

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

  return { ...tree, sections: updatedSections };
}

interface BulkAssignFromUncategorizedArgs {
  tree: OrganizeTree;
  documentIds: string[];
  toCategoryId: string;
  uncategorizedDocs: AdminUncategorizedDoc[];
}

export function computeBulkAssignFromUncategorized({
  tree,
  documentIds,
  toCategoryId,
  uncategorizedDocs,
}: BulkAssignFromUncategorizedArgs): OrganizeTree {
  if (documentIds.length === 0) return tree;
  const idSet = new Set(documentIds);
  const movingDocs = uncategorizedDocs.filter((d) => idSet.has(d.id));
  if (movingDocs.length === 0) return tree;

  const sectionKeys = Object.keys(tree.sections) as Array<
    keyof OrganizeTree["sections"]
  >;
  const targetSection = sectionKeys.find((k) =>
    tree.sections[k].categories.some((c) => c.id === toCategoryId),
  );
  if (!targetSection) return tree;

  const nextUncategorized = (tree.uncategorized ?? []).filter(
    (d) => !idSet.has(d.id),
  );

  const updatedSections = { ...tree.sections };
  updatedSections[targetSection] = {
    categories: tree.sections[targetSection].categories.map((cat) => {
      if (cat.id !== toCategoryId) return cat;
      const baseSortOrder = cat.documents.length;
      const appended = movingDocs.map((doc, i) =>
        uncategorizedToInCategory(doc, toCategoryId, baseSortOrder + i),
      );
      return { ...cat, documents: [...cat.documents, ...appended] };
    }),
  };

  return {
    ...tree,
    uncategorized: nextUncategorized,
    sections: updatedSections,
  };
}

interface BulkMoveBetweenCategoriesArgs {
  tree: OrganizeTree;
  moves: Array<{ documentId: string; fromCategoryId: string }>;
  /** When non-null, append captured docs to that category's tail.
   *  When null, push captured docs to tree.uncategorized. */
  toCategoryId: string | null;
}

export function computeBulkMoveBetweenCategories({
  tree,
  moves,
  toCategoryId,
}: BulkMoveBetweenCategoriesArgs): OrganizeTree {
  if (moves.length === 0) return tree;

  const sectionKeys = Object.keys(tree.sections) as Array<
    keyof OrganizeTree["sections"]
  >;

  const targetSection =
    toCategoryId !== null
      ? sectionKeys.find((k) =>
          tree.sections[k].categories.some((c) => c.id === toCategoryId),
        )
      : null;
  if (toCategoryId !== null && !targetSection) return tree;

  const sourceUpdates = new Map<string, Set<string>>();
  const captured: AdminDocumentInCategory[] = [];

  for (const move of moves) {
    let found: AdminDocumentInCategory | undefined;
    for (const sectionKey of sectionKeys) {
      const cat = tree.sections[sectionKey].categories.find(
        (c) => c.id === move.fromCategoryId,
      );
      if (cat) {
        found = cat.documents.find((d) => d.id === move.documentId);
        break;
      }
    }
    if (!found) continue;
    captured.push(found);
    const removeSet = sourceUpdates.get(move.fromCategoryId) ?? new Set();
    removeSet.add(move.documentId);
    sourceUpdates.set(move.fromCategoryId, removeSet);
  }

  if (captured.length === 0) return tree;

  const updatedSections = { ...tree.sections };
  for (const sectionKey of sectionKeys) {
    const section = tree.sections[sectionKey];
    let changed = false;
    const updatedCategories = section.categories.map((cat) => {
      const removeIds = sourceUpdates.get(cat.id);
      if (removeIds && removeIds.size > 0) {
        const remaining = cat.documents
          .filter((d) => !removeIds.has(d.id))
          .map((d, i) => ({
            ...d,
            membership: { ...d.membership, sortOrder: i },
          }));
        changed = true;
        return { ...cat, documents: remaining };
      }
      if (
        toCategoryId !== null &&
        sectionKey === targetSection &&
        cat.id === toCategoryId
      ) {
        const baseSortOrder = cat.documents.length;
        const appended = captured.map((doc, i) => ({
          ...doc,
          membership: { categoryId: toCategoryId, sortOrder: baseSortOrder + i },
        }));
        changed = true;
        return { ...cat, documents: [...cat.documents, ...appended] };
      }
      return cat;
    });
    if (changed) {
      updatedSections[sectionKey] = { categories: updatedCategories };
    }
  }

  const updatedUncategorized =
    toCategoryId === null
      ? [
          ...(tree.uncategorized ?? []),
          ...captured.map(inCategoryToUncategorized),
        ]
      : tree.uncategorized;

  return {
    ...tree,
    uncategorized: updatedUncategorized,
    sections: updatedSections,
  };
}

interface BulkUnassignArgs {
  tree: OrganizeTree;
  documentIds: string[];
  fromCategoryId: string;
}

export function computeBulkUnassign({
  tree,
  documentIds,
  fromCategoryId,
}: BulkUnassignArgs): OrganizeTree {
  if (documentIds.length === 0) return tree;
  const idSet = new Set(documentIds);

  const sectionKeys = Object.keys(tree.sections) as Array<
    keyof OrganizeTree["sections"]
  >;
  const sourceSection = sectionKeys.find((k) =>
    tree.sections[k].categories.some((c) => c.id === fromCategoryId),
  );
  if (!sourceSection) return tree;

  const sourceCat = tree.sections[sourceSection].categories.find(
    (c) => c.id === fromCategoryId,
  );
  if (!sourceCat) return tree;

  const removedDocs = sourceCat.documents.filter((d) => idSet.has(d.id));
  if (removedDocs.length === 0) return tree;

  const updatedSections = { ...tree.sections };
  updatedSections[sourceSection] = {
    categories: tree.sections[sourceSection].categories.map((cat) => {
      if (cat.id !== fromCategoryId) return cat;
      const remaining = cat.documents
        .filter((d) => !idSet.has(d.id))
        .map((d, i) => ({
          ...d,
          membership: { ...d.membership, sortOrder: i },
        }));
      return { ...cat, documents: remaining };
    }),
  };

  const restoredUncategorized = [
    ...(tree.uncategorized ?? []),
    ...removedDocs.map(inCategoryToUncategorized),
  ];

  return {
    ...tree,
    uncategorized: restoredUncategorized,
    sections: updatedSections,
  };
}
