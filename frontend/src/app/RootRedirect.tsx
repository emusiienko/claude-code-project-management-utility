/**
 * RootRedirect — handles the `/` route.
 *
 * Decision tree (in order):
 *  1. If last_project_id is in localStorage → /projects/:lastId/stories
 *  2. If projects exist (fetched from API) → /projects/:firstProjectId/stories
 *  3. No projects exist → stays at "/", rendering an empty Task Manager main
 *     view, and opens the Projects overlay automatically (via the outlet
 *     context set up by RootLayout) so the first project can be created
 *     (STORY-022 Revision 3 — Projects has no dedicated route to redirect to
 *     any more; it is a slide-over overlay).
 *
 * The LAST_PROJECT_KEY constant is exported so other parts of the shell
 * (sidebar, project navigation) can write to the same key.
 */

import { useEffect, useRef } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";
import { useProjectList } from "@/shared/hooks/useProjectList";
import { PageLoader } from "@/shared/components/PageLoader";
import type { OverlayControls } from "@/shared/hooks/useOverlayStack";

/** localStorage key for the last-visited project ID. */
export const LAST_PROJECT_KEY = "app:last_project_id";

/**
 * RootRedirect — resolves which screen to open on first load.
 *
 * Renders a loader while the project list is being fetched; renders nothing
 * visible once a redirect target is determined.
 */
export function RootRedirect() {
  const [lastProjectId] = useLocalStorage<string | null>(LAST_PROJECT_KEY, null);

  // If a last-visited project ID is in localStorage, use it immediately —
  // no need to fetch the project list.
  if (lastProjectId) {
    return <Navigate to={`/projects/${lastProjectId}/stories`} replace />;
  }

  return <RootRedirectFetch />;
}

/**
 * Inner component that fetches the project list and redirects based on the result.
 * Only rendered when there is no last_project_id in localStorage.
 */
function RootRedirectFetch() {
  const { data: projects, isLoading } = useProjectList();
  const { openProjects } = useOutletContext<OverlayControls>();

  // Guards the auto-open to once per mount, so dismissing the Projects
  // overlay while still projectless doesn't force it back open on every
  // background refetch of the (still-empty) project list.
  const hasAutoOpened = useRef(false);

  useEffect(() => {
    if (hasAutoOpened.current || isLoading) return;
    if (!projects || projects.length === 0) {
      hasAutoOpened.current = true;
      openProjects();
    }
  }, [isLoading, projects, openProjects]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (projects && projects.length > 0) {
    return <Navigate to={`/projects/${projects[0].id}/stories`} replace />;
  }

  // No projects at all — stay on an empty Task Manager main view; the
  // Projects overlay opened above lets the user create the first one.
  return (
    <div
      className="flex flex-1 items-center justify-center p-10 text-center"
      aria-live="polite"
    >
      <div>
        <p className="text-base font-semibold text-text">No projects yet</p>
        <p className="mt-1 text-sm text-text-secondary">
          Create your first project in the Projects panel to get started.
        </p>
      </div>
    </div>
  );
}
