/**
 * AppShell — Task Manager mode shell layer.
 *
 * Rendered inside RootLayout for all project-scoped routes
 * (/projects/:id/*). Hosts the collapsible, resizable ProjectSidebar
 * alongside its <Outlet /> for ProjectShell and leaf routes.
 *
 * Owns the sidebar's collapsed/expanded decision (STORY-006 TASK-010),
 * because it needs that fact to decide whether to render the `ResizeHandle`
 * separator between the sidebar and the outlet — no separator while
 * collapsed. It also owns the `useResizablePanel` instance that drives the
 * sidebar's resized pixel width, under a storage key distinct from
 * SessionsShell's own so the two shells' widths never affect each other.
 */

import { Outlet } from "react-router-dom";
import { ProjectSidebar } from "@/app/ProjectSidebar";
import { ResizeHandle } from "@/shared/components/ResizeHandle";
import { useResizablePanel } from "@/shared/hooks/useResizablePanel";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";

/** localStorage key for the sidebar collapsed state (unchanged by TASK-010). */
const SIDEBAR_COLLAPSED_KEY = "app:sidebar_collapsed";

/** Storage key this sidebar's resized width is committed under — distinct from SessionsShell's. */
const SIDEBAR_WIDTH_STORAGE_KEY = "app-shell:project-sidebar-width";

/** DOM id the separator's aria-controls targets. */
const SIDEBAR_ID = "app-shell-project-sidebar";

const SIDEBAR_DEFAULT_WIDTH = 240;
const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 480;
const OUTLET_MIN_WIDTH = 560;

/**
 * Task Manager mode shell — collapsible, resizable sidebar + content outlet.
 * All /projects/:id/* routes render inside this shell.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>(
    SIDEBAR_COLLAPSED_KEY,
    false,
  );

  const {
    containerRef,
    width,
    maxWidth,
    resizeToPointer,
    resizeBy,
    resizeTo,
  } = useResizablePanel({
    storageKey: SIDEBAR_WIDTH_STORAGE_KEY,
    defaultWidth: SIDEBAR_DEFAULT_WIDTH,
    minWidth: SIDEBAR_MIN_WIDTH,
    maxWidth: SIDEBAR_MAX_WIDTH,
    neighbourMinWidth: OUTLET_MIN_WIDTH,
    side: "left",
  });

  function handleToggleCollapse() {
    setCollapsed((prev) => !prev);
  }

  return (
    <div ref={containerRef} className="flex flex-1">
      {/* Collapsible, resizable project sidebar */}
      <ProjectSidebar
        id={SIDEBAR_ID}
        width={width}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {!collapsed && (
        <ResizeHandle
          ariaLabel="Resize project sidebar"
          controlsId={SIDEBAR_ID}
          width={width ?? SIDEBAR_DEFAULT_WIDTH}
          min={SIDEBAR_MIN_WIDTH}
          max={maxWidth}
          side="left"
          onResizeToPointer={resizeToPointer}
          onResizeBy={resizeBy}
          onResizeTo={resizeTo}
        />
      )}

      {/* Project content outlet — ProjectShell renders here */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
