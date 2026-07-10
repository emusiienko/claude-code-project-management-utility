/**
 * useLocalStorage — typed, reactive wrapper over browser local storage.
 *
 * Reads and writes a JSON-serialisable value under the given key. Components
 * that call this hook stay in sync: a storage-event listener propagates
 * changes made by other tabs; a custom "localstorage-update" event (dispatched
 * by the setter in this same tab) propagates changes within the same tab.
 *
 * @param key - The localStorage key to read/write.
 * @param defaultValue - Value to use when the key is absent or unparseable.
 */

import { useState, useEffect, useCallback } from "react";

const INTRA_TAB_EVENT = "localstorage-update";

function readRaw<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupted or non-JSON value — fall back to default
    return defaultValue;
  }
}

/**
 * useLocalStorage<T>
 *
 * @returns A tuple `[value, setValue]` analogous to `useState`.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => readRaw(key, defaultValue));

  // Re-sync state when another component (or tab) writes to the same key.
  useEffect(() => {
    function handleStorage(e: StorageEvent | CustomEvent) {
      // StorageEvent: fired for cross-tab changes; only react if the key matches.
      if (e instanceof StorageEvent) {
        if (e.key !== key) return;
      }
      // CustomEvent: fired for same-tab changes; detail carries the key.
      if (e instanceof CustomEvent) {
        if ((e as CustomEvent<{ key: string }>).detail.key !== key) return;
      }
      setStored(readRaw(key, defaultValue));
    }

    window.addEventListener("storage", handleStorage as EventListener);
    window.addEventListener(INTRA_TAB_EVENT, handleStorage as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage as EventListener);
      window.removeEventListener(
        INTRA_TAB_EVENT,
        handleStorage as EventListener,
      );
    };
  }, [key, defaultValue]);

  const setValue = useCallback(
    (valueOrUpdater: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next =
          typeof valueOrUpdater === "function"
            ? (valueOrUpdater as (prev: T) => T)(prev)
            : valueOrUpdater;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Storage might be unavailable (private browsing quota exceeded, etc.)
        }
        // Notify other hook instances in this tab
        window.dispatchEvent(
          new CustomEvent(INTRA_TAB_EVENT, { detail: { key } }),
        );
        return next;
      });
    },
    [key],
  );

  return [stored, setValue];
}
