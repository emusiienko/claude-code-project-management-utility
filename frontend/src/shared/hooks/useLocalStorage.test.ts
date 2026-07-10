/**
 * useLocalStorage — unit tests
 *
 * Covers: initial read from localStorage, default value fallback, setValue
 * persistence, same-tab event propagation, cross-tab StorageEvent, and
 * corrupted-value fallback.
 */

import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocalStorage } from "./useLocalStorage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Dispatch a same-tab "localstorage-update" custom event. */
function dispatchIntraTabEvent(key: string) {
  window.dispatchEvent(
    new CustomEvent("localstorage-update", { detail: { key } }),
  );
}

/** Dispatch a cross-tab StorageEvent. */
function dispatchStorageEvent(key: string, newValue: string | null) {
  window.dispatchEvent(
    new StorageEvent("storage", { key, newValue, storageArea: localStorage }),
  );
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useLocalStorage", () => {
  it("returns the default value when the key is absent", () => {
    const { result } = renderHook(() =>
      useLocalStorage<string>("test-key", "default"),
    );
    expect(result.current[0]).toBe("default");
  });

  it("reads the existing value from localStorage on mount", () => {
    localStorage.setItem("test-key", JSON.stringify("stored"));
    const { result } = renderHook(() =>
      useLocalStorage<string>("test-key", "default"),
    );
    expect(result.current[0]).toBe("stored");
  });

  it("returns the default value when the stored JSON is corrupted", () => {
    localStorage.setItem("test-key", "not-valid-json{{{");
    const { result } = renderHook(() =>
      useLocalStorage<string>("test-key", "fallback"),
    );
    expect(result.current[0]).toBe("fallback");
  });

  it("writes the new value to localStorage when setValue is called", () => {
    const { result } = renderHook(() =>
      useLocalStorage<number>("count-key", 0),
    );
    act(() => {
      result.current[1](42);
    });
    expect(result.current[0]).toBe(42);
    expect(JSON.parse(localStorage.getItem("count-key") ?? "null")).toBe(42);
  });

  it("supports functional updater form", () => {
    const { result } = renderHook(() =>
      useLocalStorage<number>("count-key", 10),
    );
    act(() => {
      result.current[1]((prev) => prev + 5);
    });
    expect(result.current[0]).toBe(15);
  });

  it("handles boolean default value", () => {
    const { result } = renderHook(() =>
      useLocalStorage<boolean>("sidebar-collapsed", false),
    );
    expect(result.current[0]).toBe(false);
    act(() => {
      result.current[1](true);
    });
    expect(result.current[0]).toBe(true);
  });

  it("handles null default value", () => {
    const { result } = renderHook(() =>
      useLocalStorage<string | null>("last-project", null),
    );
    expect(result.current[0]).toBeNull();
    act(() => {
      result.current[1]("proj-uuid");
    });
    expect(result.current[0]).toBe("proj-uuid");
  });

  it("re-syncs when a same-tab intra-tab event fires for the same key", () => {
    const { result } = renderHook(() =>
      useLocalStorage<string>("sync-key", "old"),
    );
    // Simulate another hook instance writing directly to localStorage
    localStorage.setItem("sync-key", JSON.stringify("new-from-other-instance"));
    act(() => {
      dispatchIntraTabEvent("sync-key");
    });
    expect(result.current[0]).toBe("new-from-other-instance");
  });

  it("ignores intra-tab events for a different key", () => {
    const { result } = renderHook(() =>
      useLocalStorage<string>("my-key", "unchanged"),
    );
    localStorage.setItem("other-key", JSON.stringify("irrelevant"));
    act(() => {
      dispatchIntraTabEvent("other-key");
    });
    expect(result.current[0]).toBe("unchanged");
  });

  it("re-syncs when a cross-tab StorageEvent fires for the same key", () => {
    const { result } = renderHook(() =>
      useLocalStorage<string>("cross-tab-key", "old"),
    );
    // Simulate a cross-tab write: update localStorage first, then fire StorageEvent
    localStorage.setItem("cross-tab-key", JSON.stringify("from-other-tab"));
    act(() => {
      dispatchStorageEvent("cross-tab-key", JSON.stringify("from-other-tab"));
    });
    expect(result.current[0]).toBe("from-other-tab");
  });

  it("ignores StorageEvents for a different key", () => {
    const { result } = renderHook(() =>
      useLocalStorage<string>("my-key", "unchanged"),
    );
    act(() => {
      dispatchStorageEvent("other-key", JSON.stringify("irrelevant"));
    });
    expect(result.current[0]).toBe("unchanged");
  });

  it("dispatches an intra-tab custom event when value is set", () => {
    const listener = vi.fn();
    window.addEventListener("localstorage-update", listener);
    const { result } = renderHook(() =>
      useLocalStorage<string>("event-key", "initial"),
    );
    act(() => {
      result.current[1]("updated");
    });
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener("localstorage-update", listener);
  });
});
