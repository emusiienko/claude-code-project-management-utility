/**
 * ProjectNotFound — inline "Project not found" message with a link back to
 * the app root. Shared by every screen that validates a `:projectId` route
 * param via `useProjectDetail` (ProjectShell; the Projects overlay's Settings
 * level).
 *
 * Links to "/" rather than "/projects" — Projects has no dedicated route
 * since STORY-022 Revision 3 (it is a slide-over overlay, opened from the
 * top-bar trigger, not a URL). "/" is the one address that always resolves
 * to a valid landing view via RootRedirect.
 */

import { Link } from "react-router-dom";

export function ProjectNotFound() {
  return (
    <main
      className="flex flex-1 flex-col items-center justify-center gap-3 p-8"
      role="alert"
      aria-live="polite"
    >
      <p className="text-base font-medium text-text">Project not found.</p>
      <p className="text-sm text-text-secondary">
        The project you are looking for does not exist or has been deleted.
      </p>
      <Link
        to="/"
        className="mt-2 rounded px-4 py-2 text-sm font-medium text-brand-600 underline underline-offset-4 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        Back to Projects
      </Link>
    </main>
  );
}
