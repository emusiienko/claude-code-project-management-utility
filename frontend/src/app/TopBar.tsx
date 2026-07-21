/**
 * TopBar — flat root-layout top bar.
 *
 * Renders the app-switcher combobox on the left and, on the right, a
 * mode-independent Projects link plus (in Task Manager mode only) a
 * ⚙ Settings text button. The top bar is always visible regardless of which
 * route is active.
 *
 * App mode is derived from the current pathname:
 *  - `/sessions` prefix  → Sessions mode
 *  - everything else     → Task Manager mode
 *
 * When switching from Sessions to Task Manager, the user is sent to the last
 * visited Task Manager URL (stored in localStorage). If no URL was ever
 * stored, the RootRedirect at `/` handles the fallback to the last project or
 * to `/projects`.
 */

import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { useEffect } from "react";
import { Settings, ChevronDown, FolderKanban } from "lucide-react";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";

/** localStorage key for the last-visited Task Manager URL. */
const LAST_TASK_MANAGER_URL_KEY = "app:last_task_manager_url";

/** The two app modes available in the switcher. */
type AppMode = "task-manager" | "sessions";

/** Derive the current app mode from the pathname. */
function deriveMode(pathname: string): AppMode {
  return pathname.startsWith("/sessions") ? "sessions" : "task-manager";
}

/**
 * TopBar — app-switcher combobox + global Projects link + optional Settings button.
 *
 * Renders inside RootLayout above the main outlet. No props required —
 * reads current location from the router context internally.
 */
export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = deriveMode(location.pathname);

  const [lastTaskManagerUrl, setLastTaskManagerUrl] = useLocalStorage<
    string | null
  >(LAST_TASK_MANAGER_URL_KEY, null);

  // While in Task Manager mode, keep the persisted URL up-to-date so that
  // switching to Sessions and back returns to the correct project + sub-tab.
  useEffect(() => {
    if (mode === "task-manager") {
      setLastTaskManagerUrl(location.pathname + location.search);
    }
  }, [mode, location.pathname, location.search, setLastTaskManagerUrl]);

  function handleModeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = e.target.value as AppMode;

    if (selected === "sessions") {
      navigate("/sessions");
      return;
    }

    // Task Manager: go to the last visited URL, or fall back to / which
    // RootRedirect will resolve to the last project.
    navigate(lastTaskManagerUrl ?? "/");
  }

  return (
    <header className="border-b border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: app-switcher combobox */}
        <div className="flex items-center gap-2">
          <label htmlFor="app-switcher" className="sr-only">
            App mode
          </label>
          <div className="relative inline-block">
            <select
              id="app-switcher"
              value={mode}
              onChange={handleModeChange}
              className="w-auto cursor-pointer appearance-none rounded border border-border bg-surface pl-3 pr-8 py-1.5 text-sm font-medium text-text shadow-sm transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              aria-label="Switch between Task Manager and Sessions"
            >
              <option value="task-manager">Task Manager</option>
              <option value="sessions">Sessions</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
          </div>
        </div>

        {/* Right: global Projects link (both modes) + Config button (Task Manager mode only) */}
        <div className="flex items-center gap-1">
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              [
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                isActive
                  ? "font-medium text-brand-700"
                  : "text-text-secondary hover:bg-surface-muted hover:text-text",
              ].join(" ")
            }
          >
            <FolderKanban size={15} aria-hidden="true" />
            Projects
          </NavLink>

          {mode === "task-manager" && (
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-muted hover:text-text focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              aria-label="Go to Config"
            >
              <Settings size={15} aria-hidden="true" />
              Config
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
