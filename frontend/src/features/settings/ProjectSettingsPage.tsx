/**
 * ProjectSettingsPage — entry point for the /projects/:projectId/settings route.
 *
 * Renders the project dictionary overrides for the project whose ID comes from
 * the URL params. The project is already validated by ProjectShell (the parent
 * layout shell), so this page renders the EffectiveSettingsPanel directly
 * without an additional project selector.
 *
 * The known clear-override end-to-end gap (frontend calls
 * DELETE /projects/:id/settings/:key but no REST route exposes that operation)
 * is intentionally preserved here — it is out of scope for STORY-016 and
 * requires a separate contract revision.
 */

import { useParams } from "react-router-dom";
import { EffectiveSettingsPanel } from "./components/ProjectSettings";

/**
 * Project settings tab content for the /projects/:projectId/settings route.
 *
 * Reads the projectId from the route param and delegates to
 * EffectiveSettingsPanel for the dictionary override editors.
 */
export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();

  // projectId is guaranteed by the router — this page only mounts under
  // /projects/:projectId/* routes where projectId is always present.
  const id = projectId as string;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
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
  );
}
