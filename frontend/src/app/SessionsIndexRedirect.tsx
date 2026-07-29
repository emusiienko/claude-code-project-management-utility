/**
 * SessionsIndexRedirect — handles the `/sessions` index route (STORY-009 TASK-006).
 *
 * Mirrors RootRedirect's decision tree, scoped to Sessions mode's own
 * last-visited project (a distinct project-selection surface from Task
 * Manager's, per the implementation plan):
 *  1. If a last-visited Sessions-mode project ID is in localStorage
 *     → /sessions/:lastId
 *  2. Else if projects exist → /sessions/:firstProjectId
 *  3. Else → stays at "/sessions", showing an empty state directing the user
 *     to the Projects overlay (top bar) to create the first project.
 */

import { Navigate } from "react-router-dom";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";
import { useProjectList } from "@/shared/hooks/useProjectList";
import { PageLoader } from "@/shared/components/PageLoader";
import { LAST_SESSION_PROJECT_KEY } from "@/app/SessionsSidebar";

export function SessionsIndexRedirect() {
  const [lastProjectId] = useLocalStorage<string | null>(
    LAST_SESSION_PROJECT_KEY,
    null,
  );

  if (lastProjectId) {
    return <Navigate to={`/sessions/${lastProjectId}`} replace />;
  }

  return <SessionsIndexRedirectFetch />;
}

/** Inner component that fetches the project list once no last-visited project is stored. */
function SessionsIndexRedirectFetch() {
  const { data: projects, isLoading } = useProjectList();

  if (isLoading) {
    return <PageLoader />;
  }

  if (projects && projects.length > 0) {
    return <Navigate to={`/sessions/${projects[0].id}`} replace />;
  }

  return (
    <div
      className="flex flex-1 items-center justify-center p-10 text-center"
      aria-live="polite"
    >
      <div>
        <p className="text-base font-semibold text-text">No projects yet</p>
        <p className="mt-1 text-sm text-text-secondary">
          Create a project in the Projects panel (top bar) to start tracking sessions.
        </p>
      </div>
    </div>
  );
}
