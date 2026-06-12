export const COMPARE_MAX = 4;
export const COMPARE_STORAGE_KEY = "homewise:compare";
export const COMPARE_CHANGED_EVENT = "homewise:compare-changed";

export function addCompareId(ids: string[], id: string): string[] {
  if (ids.includes(id) || ids.length >= COMPARE_MAX) return ids;
  return [...ids, id];
}

export function removeCompareId(ids: string[], id: string): string[] {
  return ids.filter((existing) => existing !== id);
}

export function toggleCompareId(ids: string[], id: string): string[] {
  return ids.includes(id) ? removeCompareId(ids, id) : addCompareId(ids, id);
}

export function readCompareIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string").slice(0, COMPARE_MAX);
  } catch {
    return [];
  }
}

export function writeCompareIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids.slice(0, COMPARE_MAX)));
  window.dispatchEvent(new CustomEvent(COMPARE_CHANGED_EVENT));
}
