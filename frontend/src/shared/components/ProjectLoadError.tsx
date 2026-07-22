/**
 * ProjectLoadError — generic fetch-error message shown for non-404 failures
 * while resolving a project id. Shared by every screen that validates the
 * project via `useProjectDetail` (ProjectShell; the Projects overlay's
 * Settings level).
 */

export function ProjectLoadError() {
  return (
    <main
      className="flex flex-1 flex-col items-center justify-center gap-3 p-8"
      role="alert"
      aria-live="polite"
    >
      <p className="text-base font-medium text-text">
        Could not load the project.
      </p>
      <p className="text-sm text-text-secondary">
        Check your connection and refresh the page.
      </p>
    </main>
  );
}
