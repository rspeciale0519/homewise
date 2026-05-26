"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";

interface SelectionState {
  ids: ReadonlySet<string>;
  anchorId: string | null;
}

type SelectionAction =
  | {
      type: "toggle";
      id: string;
      shift: boolean;
      ctrl: boolean;
      orderedIds: readonly string[];
    }
  | { type: "selectAllVisible"; ids: readonly string[] }
  | { type: "clear" }
  | { type: "prune"; existing: readonly string[] };

function reducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case "toggle": {
      const { id, shift, orderedIds } = action;
      if (shift && state.anchorId && state.anchorId !== id) {
        const a = orderedIds.indexOf(state.anchorId);
        const b = orderedIds.indexOf(id);
        if (a === -1 || b === -1) {
          const next = new Set(state.ids);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { ids: next, anchorId: id };
        }
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        const next = new Set(state.ids);
        for (let i = lo; i <= hi; i++) {
          const rangeId = orderedIds[i];
          if (rangeId !== undefined) next.add(rangeId);
        }
        return { ids: next, anchorId: state.anchorId };
      }
      const next = new Set(state.ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ids: next, anchorId: id };
    }
    case "selectAllVisible": {
      const allSelected =
        action.ids.length > 0 &&
        action.ids.every((id) => state.ids.has(id));
      if (allSelected) {
        const next = new Set(state.ids);
        for (const id of action.ids) next.delete(id);
        return { ids: next, anchorId: null };
      }
      const next = new Set(state.ids);
      for (const id of action.ids) next.add(id);
      return { ids: next, anchorId: action.ids[action.ids.length - 1] ?? null };
    }
    case "clear":
      if (state.ids.size === 0) return state;
      return { ids: new Set(), anchorId: null };
    case "prune": {
      const existing = new Set(action.existing);
      let changed = false;
      const next = new Set<string>();
      for (const id of state.ids) {
        if (existing.has(id)) next.add(id);
        else changed = true;
      }
      if (!changed) return state;
      const anchorId =
        state.anchorId && existing.has(state.anchorId) ? state.anchorId : null;
      return { ids: next, anchorId };
    }
    default:
      return state;
  }
}

export interface UseDocumentSelectionResult {
  selectedIds: ReadonlySet<string>;
  isSelected: (id: string) => boolean;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  selectedCount: number;
  toggleOne: (
    id: string,
    modifiers: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean },
  ) => void;
  toggleAll: () => void;
  /**
   * Toggle a subset of docs (e.g. all docs in one category). If every id in
   * the subset is already selected, all are deselected; otherwise every id
   * in the subset is added to the selection.
   */
  toggleSubset: (ids: readonly string[]) => void;
  clear: () => void;
}

export function useDocumentSelection(
  orderedDocIds: readonly string[],
): UseDocumentSelectionResult {
  const [state, dispatch] = useReducer(reducer, {
    ids: new Set<string>(),
    anchorId: null,
  });

  useEffect(() => {
    dispatch({ type: "prune", existing: orderedDocIds });
  }, [orderedDocIds]);

  const isSelected = useCallback(
    (id: string) => state.ids.has(id),
    [state.ids],
  );

  const toggleOne = useCallback(
    (
      id: string,
      modifiers: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean },
    ) => {
      dispatch({
        type: "toggle",
        id,
        shift: Boolean(modifiers.shiftKey),
        ctrl: Boolean(modifiers.ctrlKey || modifiers.metaKey),
        orderedIds: orderedDocIds,
      });
    },
    [orderedDocIds],
  );

  const toggleAll = useCallback(() => {
    dispatch({ type: "selectAllVisible", ids: orderedDocIds });
  }, [orderedDocIds]);

  const toggleSubset = useCallback((ids: readonly string[]) => {
    dispatch({ type: "selectAllVisible", ids });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: "clear" });
  }, []);

  return useMemo(() => {
    const allSelected =
      orderedDocIds.length > 0 &&
      orderedDocIds.every((id) => state.ids.has(id));
    const someSelected = state.ids.size > 0;
    return {
      selectedIds: state.ids,
      isSelected,
      isAllSelected: allSelected,
      isIndeterminate: someSelected && !allSelected,
      selectedCount: state.ids.size,
      toggleOne,
      toggleAll,
      toggleSubset,
      clear,
    };
  }, [
    state.ids,
    orderedDocIds,
    isSelected,
    toggleOne,
    toggleAll,
    toggleSubset,
    clear,
  ]);
}
