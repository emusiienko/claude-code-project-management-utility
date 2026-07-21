/**
 * TopBar — flat root-layout top bar.
 *
 * Renders the app-switcher combobox on the left and, on the right, two
 * persistent entries — Projects and Config — that are visible and
 * interactive in both Task Manager mode and Sessions mode (STORY-022
 * Revision 2: Config is no longer Task-Manager-only). Both entries share the
 * same active-page indication (`NavLink` `isActive` → `aria-current="page"`)
 * and `focus-visible` treatment. Because both are always present, they hold
 * their on-screen position by construction — the mounted-but-hidden
 * placeholder previously used to stabilise position (BUG-003) is retired.
 *
 * The app-switcher's selected mode is derived from the current route, with
 * one twist: while a closable view is open (`/projects`, `/settings`, or the
 * standalone Project Settings screen — see `navigationModel`), the switcher
 * reflects the *underlying* main view — the one recorded before the closable
 * view was opened — rather than defaulting to Task Manager. This keeps the
 * switcher coherent when Config or Projects is opened from Sessions.
 *
 * When switching to Task Manager, the user is sent to the last visited
 * Task-Manager-mode URL (stored in localStorage, closable views excluded). If
 * no URL was ever stored, the RootRedirect at `/` handles the fallback to the
 * last project or to `/projects`.
 *
 * Stacking: the header is an explicit-height (`h-12`), positioned
 * (`relative`) element with a z-index (`z-[110]`) higher than every overlay
 * in the app (Story slide-over/Task Detail modal top out at z-[70], nested
 * confirmation dialogs at z-[90], the Toast at z-[100]) — see BUG-004. This
 * keeps the top bar clickable no matter what is open on top of it. The Story
 * slide-over and Task Detail modal additionally offset their own fixed
 * backdrop/panel to start below `h-12` (`top-12`/`top-16`) so their own
 * headers don't get visually clipped by this one.
 */

import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { Settings, ChevronDown, FolderKanban, type LucideIcon } from "lucide-react";
import { useLastVisitedUrl } from "@/shared/hooks/useLastVisitedUrl";
import { useLastMainViewUrl } from "@/shared/hooks/useLastMainViewUrl";
import {
  type AppMode,
  deriveAppMode,
  isClosableViewPath,
  isMainViewPath,
} from "@/shared/utils/navigationModel";

/** localStorage key for the last-visited Task-Manager-mode URL. */
const LAST_TASK_MANAGER_URL_KEY = "app:last_task_manager_url";

/**
 * Narrows the recording predicate to Task-Manager-mode main-view routes —
 * excludes both Sessions and every closable view, so opening Projects or
 * Config from Task Manager never overwrites this record.
 */
function isTaskManagerMainView(pathname: string): boolean {
  return isMainViewPath(pathname) && deriveAppMode(pathname) === "task-manager";
}

/**
 * TopBar — app-switcher combobox + global Projects and Config entries.
 *
 * Renders inside RootLayout above the main outlet. No props required —
 * reads current location from the router context internally.
 */
export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const lastMainViewUrl = useLastMainViewUrl();
  const [lastTaskManagerUrl] = useLastVisitedUrl(
    LAST_TASK_MANAGER_URL_KEY,
    isTaskManagerMainView,
  );

  // While a closable view is open, reflect the main view the user will
  // return to (derived from the recorded last main view) instead of the
  // closable view's own path.
  const mode: AppMode = isClosableViewPath(location.pathname)
    ? deriveAppMode(lastMainViewUrl ?? "/")
    : deriveAppMode(location.pathname);

  function handleModeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = e.target.value as AppMode;

    if (selected === "sessions") {
      navigate("/sessions");
      return;
    }

    // Task Manager: go to the last visited Task-Manager-mode URL, or fall
    // back to / which RootRedirect will resolve to the last project.
    navigate(lastTaskManagerUrl ?? "/");
  }

  return (
    <header className="relative z-[110] h-12 border-b border-border bg-surface shadow-sm">
      <div className="flex h-full items-center justify-between px-4">
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

        {/* Right: global Projects + Config entries — always present in both modes */}
        <div className="flex items-center gap-1">
          <TopBarNavLink to="/projects" Icon={FolderKanban} label="Projects" />
          <TopBarNavLink
            to="/settings"
            Icon={Settings}
            label="Config"
            ariaLabel="Go to Config"
          />
        </div>
      </div>
    </header>
  );
}

interface TopBarNavLinkProps {
  /** Destination route, matched exactly (`end`) for active-state purposes. */
  to: string;
  /** Lucide icon component, imported by name at the call site. */
  Icon: LucideIcon;
  /** Visible label text. */
  label: string;
  /** Accessible name override; defaults to the visible label when omitted. */
  ariaLabel?: string;
}

/**
 * Shared visual/behavioral contract for the top bar's persistent nav
 * entries (Projects, Config) — both use exact-match active state
 * (`aria-current="page"`) and the same focus-visible ring.
 */
function TopBarNavLink({ to, Icon, label, ariaLabel }: TopBarNavLinkProps) {
  return (
    <NavLink
      to={to}
      end
      aria-label={ariaLabel}
      className={({ isActive }) =>
        [
          "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          isActive
            ? "font-medium text-brand-700"
            : "text-text-secondary hover:bg-surface-muted hover:text-text",
        ].join(" ")
      }
    >
      <Icon size={15} aria-hidden="true" />
      {label}
    </NavLink>
  );
}
