/**
 * ProjectSidebar — collapsible left sidebar for Task Manager mode.
 *
 * Rendered inside AppShell for all /projects/:id/* routes. Contains:
 *   - A list of all projects with the active one visually highlighted
 *   - A collapse/expand toggle button (ChevronsLeft / ChevronsRight) vertically centered on the right edge
 *
 * Collapsed state is persisted in localStorage under "app:sidebar_collapsed".
 * Selecting a project navigates to /projects/:id/stories and records the
 * project as the last visited in localStorage.
 *
 * Project management (the "Manage Projects" journey) is reached via the
 * global Projects entry in the top bar (STORY-022), not from this sidebar.
 */

import { useNavigate, useParams } from "react-router-dom";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { useProjectList } from "@/shared/hooks/useProjectList";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";
import { LAST_PROJECT_KEY } from "@/app/RootRedirect";
import type { Project } from "@/api/types";

/** localStorage key for the sidebar collapsed state. */
const SIDEBAR_COLLAPSED_KEY = "app:sidebar_collapsed";

/**
 * Navigates to a project's stories page and records the project as last visited.
 */
function useProjectNavigation() {
  const navigate = useNavigate();
  const [, setLastProjectId] = useLocalStorage<string | null>(
    LAST_PROJECT_KEY,
    null,
  );

  return function navigateToProject(projectId: string) {
    setLastProjectId(projectId);
    navigate(`/projects/${projectId}/stories`);
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ProjectListProps {
  projects: Project[];
  activeProjectId: string | undefined;
  onSelect: (projectId: string) => void;
}

/**
 * Scrollable project list with the active project highlighted.
 */
function ProjectList({ projects, activeProjectId, onSelect }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="flex-1 px-3 py-4 text-sm text-text-muted">
        No projects yet.
      </div>
    );
  }

  return (
    <nav
      className="flex-1 overflow-y-auto py-2"
      aria-label="Projects"
    >
      <ul role="list">
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
          return (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => onSelect(project.id)}
                className={[
                  "w-full truncate px-3 py-2 text-left text-sm transition-colors",
                  isActive
                    ? "bg-brand-50 font-medium text-brand-700"
                    : "text-text-secondary hover:bg-surface-muted hover:text-text",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={isActive ? "page" : undefined}
                title={project.name}
              >
                {project.name}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface CollapseToggleProps {
  collapsed: boolean;
  onToggle: () => void;
}

/**
 * Collapse/expand toggle button vertically centered on the right edge of the sidebar.
 */
function CollapseToggle({ collapsed, onToggle }: CollapseToggleProps) {
  const Icon = collapsed ? ChevronsRight : ChevronsLeft;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute -right-5 top-1/2 z-10 flex h-8 w-5 -translate-y-1/2 items-center justify-center rounded-r border border-l-0 border-border bg-surface text-text-secondary shadow-sm transition-colors hover:border-border-strong hover:bg-surface-muted hover:text-text focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * ProjectSidebar — collapsible left sidebar for Task Manager mode.
 *
 * No props required — reads the active project ID from route params
 * and the full project list from the shared TanStack Query hook.
 */
export function ProjectSidebar() {
  const { projectId: activeProjectId } = useParams<{ projectId: string }>();
  const navigateToProject = useProjectNavigation();

  const [collapsed, setCollapsed] = useLocalStorage<boolean>(
    SIDEBAR_COLLAPSED_KEY,
    false,
  );

  const { data: projects = [] } = useProjectList();

  function handleToggle() {
    setCollapsed((prev) => !prev);
  }

  // When collapsed, render only the toggle button so main content fills full width.
  if (collapsed) {
    return (
      <aside
        className="relative flex-none"
        aria-label="Project sidebar (collapsed)"
      >
        <CollapseToggle collapsed={collapsed} onToggle={handleToggle} />
      </aside>
    );
  }

  return (
    <aside
      className="relative flex w-60 flex-none flex-col border-r border-border bg-surface"
      aria-label="Project sidebar"
    >
      <CollapseToggle collapsed={collapsed} onToggle={handleToggle} />

      <ProjectList
        projects={projects}
        activeProjectId={activeProjectId}
        onSelect={navigateToProject}
      />
    </aside>
  );
}
