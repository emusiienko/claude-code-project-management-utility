/**
 * Root layout shell rendered by every route.
 *
 * Provides the application chrome: a top navigation bar with the 3 top-level
 * navigation items (Projects, Sessions, Settings) as required by the Web UI
 * spec, plus an <Outlet /> where the matched route renders.
 *
 * This component is domain-agnostic — it holds no business logic.
 */

import { NavLink, Outlet } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
}

/**
 * Top-level navigation items as defined in the Web UI requirements.
 * Projects (home), Sessions, and System Settings are the only top-level routes.
 * Stories, Tasks, Milestones, etc. are sub-views accessed through their parent context.
 */
const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Projects" },
  { to: "/sessions", label: "Sessions" },
  { to: "/settings", label: "Settings" },
];

/**
 * Root application layout with top navigation and content outlet.
 * All screens render inside the <Outlet /> below the nav bar.
 */
export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-subtle">
      {/* Top navigation bar */}
      <header className="border-b border-border bg-surface shadow-sm">
        <nav
          className="mx-auto flex max-w-screen-xl items-center gap-1 px-4 py-2"
          aria-label="Main navigation"
        >
          {/* App identity */}
          <span className="mr-4 text-sm font-semibold text-text">
            Agent&nbsp;Utility
          </span>

          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              // `end` on the home route prevents it from matching every sub-route
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  "rounded px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-brand-100 font-medium text-brand-700"
                    : "text-text-secondary hover:bg-surface-muted hover:text-text",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Screen content */}
      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
