/**
 * AppShell — Task Manager mode shell layer.
 *
 * Rendered inside RootLayout for all project-scoped routes
 * (/projects/:id/*). Hosts the collapsible ProjectSidebar alongside
 * its <Outlet /> for ProjectShell and leaf routes.
 */

import { Outlet } from "react-router-dom";
import { ProjectSidebar } from "@/app/ProjectSidebar";

/**
 * Task Manager mode shell — collapsible sidebar + content outlet.
 * All /projects/:id/* routes render inside this shell.
 */
export function AppShell() {
  return (
    <div className="flex flex-1">
      {/* Collapsible project sidebar */}
      <ProjectSidebar />

      {/* Project content outlet — ProjectShell renders here */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
