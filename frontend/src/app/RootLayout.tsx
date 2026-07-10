/**
 * RootLayout — flat root layout shell.
 *
 * Renders the TopBar (app switcher + Settings button) above an <Outlet />
 * for all child routes. Routes rendered directly here (/projects, /sessions,
 * /settings) have no project sidebar or sub-nav chrome.
 */

import { Outlet } from "react-router-dom";
import { TopBar } from "@/app/TopBar";

/**
 * Flat root layout — top bar + main outlet. No project chrome.
 */
export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-subtle">
      {/* Top bar — app switcher + Settings button */}
      <TopBar />

      {/* Content outlet for /projects, /sessions, /settings and AppShell */}
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
