/**
 * RootLayout — flat root layout shell.
 *
 * Renders the TopBar (app switcher + Projects/Config overlay triggers) above
 * an <Outlet /> for all child routes, plus the always-mounted OverlayHost
 * layered on top (STORY-022 Revision 3). The overlay stack (`useOverlayStack`)
 * is owned here — one level above both consumers — and passed down:
 *   - to TopBar as a prop, so its triggers can open/reflect the overlay
 *   - to OverlayHost as a prop, so it can render the active panel
 *   - to routed children via `<Outlet context>`, so RootRedirect can open
 *     the Projects overlay automatically on a projectless cold start
 *
 * Routes rendered in the outlet (/sessions, and the whole /projects/:id/*
 * subtree) have no project-management chrome of their own — Projects and
 * Config are reached exclusively through the overlay now.
 */

import { Outlet } from "react-router-dom";
import { TopBar } from "@/app/TopBar";
import { OverlayHost } from "@/app/OverlayHost";
import { useOverlayStack } from "@/shared/hooks/useOverlayStack";

/**
 * Flat root layout — top bar + main outlet + overlay host. No project chrome.
 */
export function RootLayout() {
  const overlay = useOverlayStack();

  return (
    <div className="flex min-h-screen flex-col bg-surface-subtle">
      {/* Top bar — app switcher + Projects/Config overlay triggers */}
      <TopBar overlay={overlay} />

      {/* Content outlet for /sessions and the AppShell (/projects/:id/*) subtree */}
      <main className="flex flex-1 flex-col">
        <Outlet context={overlay} />
      </main>

      {/* Always-mounted overlay host — renders nothing while the stack is empty */}
      <OverlayHost overlay={overlay} />
    </div>
  );
}
