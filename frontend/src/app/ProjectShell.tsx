/**
 * ProjectShell — per-project sub-navigation shell layer.
 *
 * Rendered inside AppShell for all /projects/:id/* routes. Hosts:
 *   - A horizontal sub-nav bar with four tabs: Stories, Board, Milestones, Settings.
 *     The tab matching the current location is visually highlighted.
 *   - A nested <Outlet /> where the active tab's content renders.
 *   - An inline "Not found" message with a link back to /projects when the
 *     project ID in the URL does not resolve to an existing project.
 */

import { NavLink, Outlet, Link, useParams } from "react-router-dom";
import { useProjectDetail } from "@/shared/hooks/useProjectDetail";
import { PageLoader } from "@/shared/components/PageLoader";

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
  { label: "Settings", segment: "settings" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ProjectSubNavProps {
  projectId: string;
}

/**
 * Horizontal four-tab sub-navigation bar for the project context.
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

/**
 * Inline "Project not found" message with a link back to /projects.
 * Rendered instead of the sub-nav and outlet when the project ID is invalid.
 */
function ProjectNotFound() {
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

/**
 * Generic fetch error message — shown for non-404 API failures.
 */
function ProjectLoadError() {
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Per-project sub-nav shell.
 *
 * Validates the project ID from the URL params, then renders the four-tab
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
