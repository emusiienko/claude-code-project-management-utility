/**
 * RootRedirect — handles the `/` route.
 *
 * Decision tree (in order):
 *  1. If last_project_id is in localStorage → /projects/:lastId/stories
 *  2. If projects exist (fetched from API) → /projects/:firstProjectId/stories
 *  3. No projects exist → /projects (management page so the user can create one)
 *
 * The LAST_PROJECT_KEY constant is exported so other parts of the shell
 * (sidebar, project navigation) can write to the same key.
 */

import { Navigate } from "react-router-dom";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";
import { useProjectList } from "@/shared/hooks/useProjectList";
import { PageLoader } from "@/shared/components/PageLoader";

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

  if (isLoading) {
    return <PageLoader />;
  }

  if (projects && projects.length > 0) {
    return <Navigate to={`/projects/${projects[0].id}/stories`} replace />;
  }

  // No projects at all — open the management page so the user can create one.
  return <Navigate to="/projects" replace />;
}
