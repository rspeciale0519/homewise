import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePersistedBoolean } from "./use-persisted-boolean";

const KEY = "homewise.test.persisted-bool";

describe("usePersistedBoolean", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns the default value when nothing is stored", () => {
    const { result } = renderHook(() => usePersistedBoolean(KEY, true));
    expect(result.current[0]).toBe(true);
  });

  it("reads stored 'true' on first render", () => {
    window.localStorage.setItem(KEY, "true");
    const { result } = renderHook(() => usePersistedBoolean(KEY, false));
    expect(result.current[0]).toBe(true);
  });

  it("reads stored 'false' on first render", () => {
    window.localStorage.setItem(KEY, "false");
    const { result } = renderHook(() => usePersistedBoolean(KEY, true));
    expect(result.current[0]).toBe(false);
  });

  it("persists writes to localStorage and updates the hook", () => {
    const { result } = renderHook(() => usePersistedBoolean(KEY, true));
    expect(result.current[0]).toBe(true);
    act(() => result.current[1](false));
    expect(window.localStorage.getItem(KEY)).toBe("false");
    expect(result.current[0]).toBe(false);
  });

  it("syncs two hook instances on the same key (intra-tab)", () => {
    const a = renderHook(() => usePersistedBoolean(KEY, false));
    const b = renderHook(() => usePersistedBoolean(KEY, false));
    expect(a.result.current[0]).toBe(false);
    expect(b.result.current[0]).toBe(false);
    act(() => a.result.current[1](true));
    expect(a.result.current[0]).toBe(true);
    expect(b.result.current[0]).toBe(true);
  });

  it("ignores unrelated localStorage keys", () => {
    window.localStorage.setItem("other-key", "true");
    const { result } = renderHook(() => usePersistedBoolean(KEY, false));
    expect(result.current[0]).toBe(false);
  });
});
