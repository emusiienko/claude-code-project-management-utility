/**
 * ProjectSidebar — collapsible, resizable left sidebar for Task Manager mode.
 *
 * Rendered inside AppShell for all /projects/:id/* routes. Contains:
 *   - A list of all projects with the active one visually highlighted
 *   - A collapse/expand toggle button (ChevronsLeft / ChevronsRight) vertically centered on the right edge
 *
 * Collapsed/expanded state and its `app:sidebar_collapsed` localStorage
 * persistence are owned by `AppShell` (STORY-006 TASK-010) — this component
 * only renders according to the `collapsed` prop and calls `onToggleCollapse`
 * when the toggle is clicked. Likewise, the sidebar's resized pixel width is
 * owned by AppShell's `useResizablePanel` instance and passed down as
 * `width`; this component neither reads nor writes any width state itself.
 * While expanded, the sidebar renders `width` as an inline pixel value,
 * falling back to the `w-60` class when `width` is `null`. The right-edge
 * border is rendered by AppShell's `ResizeHandle` separator, not here.
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

export interface ProjectSidebarProps {
  /** DOM id applied to the sidebar's root element — AppShell's separator targets it via aria-controls. */
  id: string;
  /** Pixel width to render while expanded, or `null` to fall back to the default `w-60`. */
  width: number | null;
  /** Whether the sidebar is currently collapsed — owned by AppShell. */
  collapsed: boolean;
  /** Toggles collapsed/expanded — owned by AppShell. */
  onToggleCollapse: () => void;
}

/**
 * ProjectSidebar — collapsible, resizable left sidebar for Task Manager mode.
 *
 * Reads the active project ID from route params and the full project list
 * from the shared TanStack Query hook; everything else (collapse state,
 * resized width) arrives as props.
 */
export function ProjectSidebar({
  id,
  width,
  collapsed,
  onToggleCollapse,
}: ProjectSidebarProps) {
  const { projectId: activeProjectId } = useParams<{ projectId: string }>();
  const navigateToProject = useProjectNavigation();

  const { data: projects = [] } = useProjectList();

  // When collapsed, render only the toggle button so main content fills full width.
  if (collapsed) {
    return (
      <aside
        id={id}
        className="relative flex-none"
        aria-label="Project sidebar (collapsed)"
      >
        <CollapseToggle collapsed={collapsed} onToggle={onToggleCollapse} />
      </aside>
    );
  }

  return (
    <aside
      id={id}
      className={[
        "relative flex flex-none flex-col bg-surface",
        width === null ? "w-60" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={width !== null ? { width: `${width}px` } : undefined}
      aria-label="Project sidebar"
    >
      <CollapseToggle collapsed={collapsed} onToggle={onToggleCollapse} />

      <ProjectList
        projects={projects}
        activeProjectId={activeProjectId}
        onSelect={navigateToProject}
      />
    </aside>
  );
}
