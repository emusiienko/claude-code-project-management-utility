/**
 * ProjectNotFound — inline "Project not found" message with a link back to
 * /projects. Shared by every standalone screen that validates a `:projectId`
 * route param via `useProjectDetail` (ProjectShell, ProjectSettingsPage).
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
        to="/projects"
        className="mt-2 rounded px-4 py-2 text-sm font-medium text-brand-600 underline underline-offset-4 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        Back to Projects
      </Link>
    </main>
  );
}
