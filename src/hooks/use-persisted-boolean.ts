"use client";

import { useCallback, useSyncExternalStore } from "react";

function readStored(storageKey: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  } catch {
    return null;
  }
}

function writeStored(storageKey: string, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, value ? "true" : "false");
  } catch {
    // quota / privacy mode — silently ignore
  }
}

function eventName(storageKey: string): string {
  return `homewise:localStorage:${storageKey}`;
}

export function usePersistedBoolean(
  storageKey: string,
  defaultValue: boolean,
): [boolean, (next: boolean) => void] {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === "undefined") return () => {};
      const handler = () => callback();
      const channel = eventName(storageKey);
      window.addEventListener(channel, handler);
      // Listen for cross-tab updates as well.
      const storageHandler = (e: StorageEvent) => {
        if (e.key === storageKey) callback();
      };
      window.addEventListener("storage", storageHandler);
      return () => {
        window.removeEventListener(channel, handler);
        window.removeEventListener("storage", storageHandler);
      };
    },
    [storageKey],
  );

  const getSnapshot = useCallback(() => {
    const stored = readStored(storageKey);
    return stored ?? defaultValue;
  }, [storageKey, defaultValue]);

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setValue = useCallback(
    (next: boolean) => {
      writeStored(storageKey, next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(eventName(storageKey)));
      }
    },
    [storageKey],
  );

  return [value, setValue];
}
