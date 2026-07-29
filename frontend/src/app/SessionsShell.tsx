/**
 * SessionsShell — Sessions mode shell layer (STORY-009 TASK-006).
 *
 * Mirrors AppShell (Task Manager mode): rendered for the whole `/sessions/*`
 * route subtree, hosting the collapsible SessionsSidebar (a distinct
 * project-selection surface from Task Manager's ProjectSidebar, kept
 * independently navigable per the implementation plan) alongside its
 * <Outlet /> for the project-scoped session list/detail routes.
 */

import { Outlet } from "react-router-dom";
import { SessionsSidebar } from "@/app/SessionsSidebar";

/**
 * Sessions mode shell — collapsible project sidebar + content outlet.
 * All /sessions/* routes render inside this shell.
 */
export function SessionsShell() {
  return (
    <div className="flex flex-1">
      {/* Collapsible project sidebar, scoped to Sessions mode */}
      <SessionsSidebar />

      {/* Content outlet — session list/detail routes render here */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
