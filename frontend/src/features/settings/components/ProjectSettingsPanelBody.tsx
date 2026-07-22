/**
 * ProjectSettingsPanelBody — second level of the Projects overlay stack
 * (STORY-022 Revision 3): a single project's dictionary override editors.
 *
 * Renders inside OverlayHost, which owns the panel chrome (title, Back to
 * the project list, Dismiss). This component owns the project-existence
 * check, the effective-settings content, and the "Open in Task Manager"
 * forward bridge (TASK-010) — the responsibilities the former standalone
 * ProjectSettingsPage route carried, minus the project-named heading and the
 * back-link to /projects (the overlay frame's Back/Dismiss replace those).
 *
 * Performs its own project-existence check via `useProjectDetail` so an
 * unresolved project id still yields a "Project not found" state, even
 * though this panel has no route of its own to validate against.
 */

import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjectDetail } from "@/shared/hooks/useProjectDetail";
import { PageLoader } from "@/shared/components/PageLoader";
import { ProjectNotFound } from "@/shared/components/ProjectNotFound";
import { ProjectLoadError } from "@/shared/components/ProjectLoadError";
import { EffectiveSettingsPanel } from "./ProjectSettings";

interface ProjectSettingsPanelBodyProps {
  projectId: string;
  /**
   * Dismisses the whole Projects overlay stack. Called after navigating to
   * the project's Stories so the "Open in Task Manager" action both
   * redirects the main view and closes the overlay in one step (TASK-010,
   * resolves BUG-006).
   */
  onDismissOverlay: () => void;
}

/**
 * Project Settings overlay level: project-named heading, an "Open in Task
 * Manager" forward bridge, and the dictionary override editors for the
 * given project.
 */
export function ProjectSettingsPanelBody({ projectId, onDismissOverlay }: ProjectSettingsPanelBodyProps) {
  const navigate = useNavigate();
  const { project, isLoading, isNotFound, isError } = useProjectDetail(projectId);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isNotFound) {
    return <ProjectNotFound />;
  }

  if (isError || !project) {
    return <ProjectLoadError />;
  }

  function handleOpenInTaskManager() {
    navigate(`/projects/${projectId}/stories`);
    onDismissOverlay();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="mb-1 text-lg font-semibold text-text">{project.name}</h3>
          <p className="text-sm text-text-secondary">
            Override dictionary values for this project. Keys showing an
            &ldquo;Override&rdquo; badge have project-specific values that
            supersede the system defaults. Use &ldquo;Clear override&rdquo; to
            restore a key to the system default.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenInTaskManager}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          Open in Task Manager
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>

      <EffectiveSettingsPanel projectId={projectId} />
    </div>
  );
}
