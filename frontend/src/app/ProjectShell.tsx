/**
 * ProjectShell — per-project sub-navigation shell layer.
 *
 * Rendered inside AppShell for all /projects/:id/* routes. Hosts:
 *   - A horizontal sub-nav bar with three tabs: Stories, Board, Milestones.
 *     Project Settings is a standalone screen (STORY-022 TASK-004), not a tab
 *     here — see /projects/:id/settings in the route table.
 *     The tab matching the current location is visually highlighted.
 *   - A nested <Outlet /> where the active tab's content renders.
 *   - An inline "Not found" message with a link back to /projects when the
 *     project ID in the URL does not resolve to an existing project.
 */

import { NavLink, Outlet, useParams } from "react-router-dom";
import { useProjectDetail } from "@/shared/hooks/useProjectDetail";
import { PageLoader } from "@/shared/components/PageLoader";
import { ProjectNotFound } from "@/shared/components/ProjectNotFound";
import { ProjectLoadError } from "@/shared/components/ProjectLoadError";

// ---------------------------------------------------------------------------
// Sub-nav tab definitions
// ---------------------------------------------------------------------------

interface SubNavTab {
  label: string;
  /** Path segment relative to /projects/:id/ */
  segment: string;
}

const SUB_NAV_TABS: SubNavTab[] = [
  { label: "Stories", segment: "stories" },
  { label: "Board", segment: "board" },
  { label: "Milestones", segment: "milestones" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ProjectSubNavProps {
  projectId: string;
}

/**
 * Horizontal three-tab sub-navigation bar for the project context.
 * Active tab is highlighted via NavLink's `isActive` state.
 */
function ProjectSubNav({ projectId }: ProjectSubNavProps) {
  return (
    <nav
      className="border-b border-border bg-surface"
      aria-label="Project sections"
    >
      <ul
        role="list"
        className="flex items-center gap-0 px-4"
      >
        {SUB_NAV_TABS.map((tab) => (
          <li key={tab.segment}>
            <NavLink
              to={`/projects/${projectId}/${tab.segment}`}
              className={({ isActive }) =>
                [
                  "inline-block border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-text-secondary hover:border-border-strong hover:text-text",
                ].join(" ")
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Per-project sub-nav shell.
 *
 * Validates the project ID from the URL params, then renders the three-tab
 * sub-nav and a nested outlet for the active tab's content. Renders an inline
 * "Not found" message when the API returns 404 for the given project ID.
 */
export function ProjectShell() {
  const { projectId } = useParams<{ projectId: string }>();

  // projectId is guaranteed by the router — the shell is only rendered under
  // /projects/:projectId/* routes where projectId is always present.
  const id = projectId as string;

  const { isLoading, isNotFound, isError } = useProjectDetail(id);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isNotFound) {
    return <ProjectNotFound />;
  }

  if (isError) {
    return <ProjectLoadError />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <ProjectSubNav projectId={id} />

      {/* Tab content outlet — leaf routes (StoriesPage, BoardPage, etc.) render here */}
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
