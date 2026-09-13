/**
 * SessionsSidebar — collapsible, resizable left sidebar for Sessions mode.
 *
 * Structurally mirrors Task Manager's ProjectSidebar, but is a distinct
 * project-selection surface: it chooses which project's *sessions* to view,
 * independent of Task Manager's last-visited project. Persists its own
 * collapsed state and last-visited project under Sessions-scoped
 * localStorage keys so the two modes never interfere with each other.
 *
 * Collapsed/expanded state and its `app:sessions_sidebar_collapsed`
 * localStorage persistence are owned by `SessionsShell` (STORY-006
 * TASK-010) — this component only renders according to the `collapsed` prop
 * and calls `onToggleCollapse` when the toggle is clicked. Likewise, the
 * sidebar's resized pixel width is owned by SessionsShell's own
 * `useResizablePanel` instance (a distinct storage key from AppShell's, so
 * the two sidebars' widths never affect each other) and passed down as
 * `width`. While expanded, the sidebar renders `width` as an inline pixel
 * value, falling back to the `w-60` class when `width` is `null`. The
 * right-edge border is rendered by SessionsShell's `ResizeHandle` separator,
 * not here.
 *
 * Project management (create/edit/delete) is reached via the global Projects
 * overlay in the top bar, not from this sidebar.
 */

import { useNavigate, useParams } from "react-router-dom";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { useProjectList } from "@/shared/hooks/useProjectList";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";
import type { Project } from "@/api/types";

/** localStorage key for the last-visited project within Sessions mode. */
export const LAST_SESSION_PROJECT_KEY = "app:last_session_project_id";

/**
 * Navigates to a project's session list and records it as last visited
 * within Sessions mode.
 */
function useSessionsProjectNavigation() {
  const navigate = useNavigate();
  const [, setLastProjectId] = useLocalStorage<string | null>(
    LAST_SESSION_PROJECT_KEY,
    null,
  );

  return function navigateToProject(projectId: string) {
    setLastProjectId(projectId);
    navigate(`/sessions/${projectId}`);
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

/** Scrollable project list with the active project highlighted. */
function ProjectList({ projects, activeProjectId, onSelect }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="flex-1 px-3 py-4 text-sm text-text-muted">
        No projects yet.
      </div>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto py-2" aria-label="Projects">
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

/** Collapse/expand toggle button vertically centered on the right edge of the sidebar. */
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

export interface SessionsSidebarProps {
  /** DOM id applied to the sidebar's root element — SessionsShell's separator targets it via aria-controls. */
  id: string;
  /** Pixel width to render while expanded, or `null` to fall back to the default `w-60`. */
  width: number | null;
  /** Whether the sidebar is currently collapsed — owned by SessionsShell. */
  collapsed: boolean;
  /** Toggles collapsed/expanded — owned by SessionsShell. */
  onToggleCollapse: () => void;
}

/**
 * SessionsSidebar — collapsible, resizable left sidebar for Sessions mode.
 *
 * Reads the active project ID from route params and the full project list
 * from the shared TanStack Query hook; everything else (collapse state,
 * resized width) arrives as props.
 */
export function SessionsSidebar({
  id,
  width,
  collapsed,
  onToggleCollapse,
}: SessionsSidebarProps) {
  const { projectId: activeProjectId } = useParams<{ projectId: string }>();
  const navigateToProject = useSessionsProjectNavigation();

  const { data: projects = [] } = useProjectList();

  if (collapsed) {
    return (
      <aside
        id={id}
        className="relative flex-none"
        aria-label="Sessions project sidebar (collapsed)"
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
      aria-label="Sessions project sidebar"
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
