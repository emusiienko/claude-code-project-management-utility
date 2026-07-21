/**
 * useLastMainViewUrl — records and exposes the last-visited main-view URL
 * (STORY-022 Revision 2).
 *
 * Must be called from an always-mounted component (the top bar) so every
 * route change is observed. Closable-view routes (`/projects`, `/settings`,
 * the standalone Project Settings screen — see `navigationModel`) are never
 * recorded, so opening Projects or Config never overwrites the return
 * target. Consumed here to derive the app-switcher's "underlying main view"
 * while a closable view is open, and by TASK-007's close-to-last-main-view
 * navigation.
 */

import { useLastVisitedUrl } from "@/shared/hooks/useLastVisitedUrl";
import { isMainViewPath } from "@/shared/utils/navigationModel";

/** localStorage key for the last-visited main-view URL (path + query). */
export const LAST_MAIN_VIEW_URL_KEY = "app:last_main_view_url";

/**
 * @returns The recorded last main-view URL, or null if none has been
 *   recorded yet (e.g. a cold load straight into a closable view).
 */
export function useLastMainViewUrl(): string | null {
  const [lastMainViewUrl] = useLastVisitedUrl(
    LAST_MAIN_VIEW_URL_KEY,
    isMainViewPath,
  );
  return lastMainViewUrl;
}
