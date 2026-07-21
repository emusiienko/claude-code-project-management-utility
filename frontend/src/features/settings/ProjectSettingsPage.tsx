/**
 * ProjectSettingsPage — standalone screen at /projects/:projectId/settings.
 *
 * Promoted from a per-project sub-navigation tab to a top-level screen
 * (STORY-022 TASK-004), mirroring the standalone Milestone Detail screen
 * (/milestones/:id): rendered outside both the Task Manager sidebar shell
 * and the per-project sub-navigation shell, with its own project-named
 * heading and a back-link to the Projects Management page.
 *
 * Since this route no longer renders inside ProjectShell, it performs its
 * own project-existence check via `useProjectDetail` — the same hook
 * ProjectShell uses — so an unresolved project id still yields a
 * "Project not found" state.
 *
 * The known clear-override end-to-end gap (frontend calls
 * DELETE /projects/:id/settings/:key but no REST route exposes that operation)
 * is intentionally preserved here — it is out of scope for this story and
 * requires a separate contract revision.
 */

import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useProjectDetail } from "@/shared/hooks/useProjectDetail";
import { PageLoader } from "@/shared/components/PageLoader";
import { ProjectNotFound } from "@/shared/components/ProjectNotFound";
import { ProjectLoadError } from "@/shared/components/ProjectLoadError";
import { EffectiveSettingsPanel } from "./components/ProjectSettings";

/**
 * Standalone Project Settings screen for the /projects/:projectId/settings
 * route. Resolves the project from the route param, then renders a
 * project-named heading, a back-link to /projects, and the dictionary
 * override editors.
 */
export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();

  // projectId is guaranteed by the router — this page only mounts under the
  // /projects/:projectId/settings route where projectId is always present.
  const id = projectId as string;

  const { project, isLoading, isNotFound, isError } = useProjectDetail(id);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isNotFound) {
    return <ProjectNotFound />;
  }

  if (isError || !project) {
    return <ProjectLoadError />;
  }

  return (
    <div className="p-6">
      {/* Back link to the Projects Management page — this screen's launch surface */}
      <Link
        to="/projects"
        className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
        aria-label="Back to Projects"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to Projects
      </Link>

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-text">
            {project.name}
          </h1>
          <h2 className="mb-1 text-xl font-semibold text-text">
            Project Settings
          </h2>
          <p className="text-sm text-text-secondary">
            Override dictionary values for this project. Keys showing an
            &ldquo;Override&rdquo; badge have project-specific values that
            supersede the system defaults. Use &ldquo;Clear override&rdquo; to
            restore a key to the system default.
          </p>
        </div>

        <EffectiveSettingsPanel projectId={id} />
      </div>
    </div>
  );
}
