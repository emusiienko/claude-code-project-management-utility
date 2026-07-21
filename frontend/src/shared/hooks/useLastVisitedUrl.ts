/**
 * useLastVisitedUrl — records the current route (path + query) to
 * localStorage whenever it matches `shouldRecord`, and returns the most
 * recently recorded value.
 *
 * Must be called from an always-mounted component (e.g. the top bar) so
 * every route change is observed. Backs both the "last main view" record and
 * the narrower "last Task-Manager-mode view" record (see `TopBar`).
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";

/**
 * @param key - localStorage key to persist the recorded URL under.
 * @param shouldRecord - Predicate over the current pathname; the URL is
 *   recorded only when this returns true, so excluded routes never overwrite
 *   the last recorded value.
 * @returns A tuple of the last recorded URL (or null if none yet) and the
 *   underlying setter, analogous to `useLocalStorage`.
 */
export function useLastVisitedUrl(
  key: string,
  shouldRecord: (pathname: string) => boolean,
): [string | null, (value: string | null) => void] {
  const location = useLocation();
  const [lastUrl, setLastUrl] = useLocalStorage<string | null>(key, null);

  useEffect(() => {
    if (shouldRecord(location.pathname)) {
      setLastUrl(location.pathname + location.search);
    }
  }, [location.pathname, location.search, shouldRecord, setLastUrl]);

  return [lastUrl, setLastUrl];
}
