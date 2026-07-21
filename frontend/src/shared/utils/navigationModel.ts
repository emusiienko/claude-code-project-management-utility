/**
 * navigationModel — single source of truth for the app's main-view vs
 * closable-view route classification (STORY-022 Revision 2).
 *
 * Main views are the app's two primary destinations: Task Manager (a
 * project's Stories/Board/Milestones, including an open story slide-over or
 * task modal) and Sessions. Closable views are secondary surfaces layered
 * over whichever main view is active: Projects management (`/projects`) and
 * system Config (`/settings`). The standalone Project Settings screen
 * (`/projects/:projectId/settings`) is a sub-page of the Projects closable
 * view rather than a main view of its own, so it is classified as closable
 * too — it must not overwrite the recorded last main view.
 */

/** The two app modes the top-bar app-switcher chooses between. */
export type AppMode = "task-manager" | "sessions";

/** Matches the standalone Project Settings screen (a Projects sub-page). */
const PROJECT_SETTINGS_PATTERN = /^\/projects\/[^/]+\/settings$/;

/**
 * Returns true when `pathname` is a closable view: `/projects`, `/settings`,
 * or the standalone Project Settings sub-page. Everything else is a main view.
 */
export function isClosableViewPath(pathname: string): boolean {
  return (
    pathname === "/projects" ||
    pathname === "/settings" ||
    PROJECT_SETTINGS_PATTERN.test(pathname)
  );
}

/** Returns true when `pathname` is a main view (Task Manager or Sessions). */
export function isMainViewPath(pathname: string): boolean {
  return !isClosableViewPath(pathname);
}

/** Derives the app mode a given main-view pathname belongs to. */
export function deriveAppMode(pathname: string): AppMode {
  return pathname.startsWith("/sessions") ? "sessions" : "task-manager";
}
