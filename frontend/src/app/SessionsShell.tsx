/**
 * SessionsShell — Sessions mode shell layer (STORY-009 TASK-006).
 *
 * Mirrors AppShell (Task Manager mode): rendered for the whole `/sessions/*`
 * route subtree, hosting the collapsible, resizable SessionsSidebar (a
 * distinct project-selection surface from Task Manager's ProjectSidebar,
 * kept independently navigable per the implementation plan) alongside its
 * <Outlet /> for the project-scoped session list/detail routes.
 *
 * Owns the sidebar's collapsed/expanded decision (STORY-006 TASK-010),
 * because it needs that fact to decide whether to render the `ResizeHandle`
 * separator between the sidebar and the outlet — no separator while
 * collapsed. It also owns the `useResizablePanel` instance that drives the
 * sidebar's resized pixel width, under a storage key distinct from
 * AppShell's own so the two shells' widths never affect each other.
 */

import { Outlet } from "react-router-dom";
import { SessionsSidebar } from "@/app/SessionsSidebar";
import { ResizeHandle } from "@/shared/components/ResizeHandle";
import { useResizablePanel } from "@/shared/hooks/useResizablePanel";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";

/** localStorage key for the Sessions sidebar collapsed state (unchanged by TASK-010). */
const SESSIONS_SIDEBAR_COLLAPSED_KEY = "app:sessions_sidebar_collapsed";

/** Storage key this sidebar's resized width is committed under — distinct from AppShell's. */
const SIDEBAR_WIDTH_STORAGE_KEY = "sessions-shell:project-sidebar-width";

/** DOM id the separator's aria-controls targets. */
const SIDEBAR_ID = "sessions-shell-project-sidebar";

const SIDEBAR_DEFAULT_WIDTH = 240;
const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 480;
const OUTLET_MIN_WIDTH = 560;

/**
 * Sessions mode shell — collapsible, resizable project sidebar + content outlet.
 * All /sessions/* routes render inside this shell.
 */
export function SessionsShell() {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>(
    SESSIONS_SIDEBAR_COLLAPSED_KEY,
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
      {/* Collapsible, resizable project sidebar, scoped to Sessions mode */}
      <SessionsSidebar
        id={SIDEBAR_ID}
        width={width}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {!collapsed && (
        <ResizeHandle
          ariaLabel="Resize sessions project sidebar"
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

      {/* Content outlet — session list/detail routes render here */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
