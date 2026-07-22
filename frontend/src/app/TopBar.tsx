/**
 * TopBar — flat root-layout top bar.
 *
 * Renders the app-switcher combobox on the left and, on the right, two
 * persistent entries — Projects and Config — that are visible and
 * interactive in both Task Manager mode and Sessions mode. Since STORY-022
 * Revision 3, both entries are **overlay triggers**, not route `NavLink`s:
 * clicking one opens its slide-over overlay (see `OverlayHost`) over
 * whichever main view is currently active, without changing the route. Their
 * open/active indication is driven by the overlay stack's `kind`, not by
 * route matching. Both share the same `focus-visible` treatment.
 *
 * The app-switcher derives its mode from the current route only — Projects
 * and Config have no dedicated URL to special-case, since they are overlay
 * state rather than routes (this simplifies away the Revision-2 main-view/
 * closable-view classification and last-main-view recording entirely).
 * Switching to Task Manager navigates to "/", which RootRedirect resolves to
 * the last-visited or first project's Stories (or an empty Task Manager view
 * with the Projects overlay auto-opened when no project exists yet).
 *
 * Stacking: the header is an explicit-height (`h-12`), positioned
 * (`relative`) element with a z-index (`z-[110]`) higher than every overlay
 * in the app (Story slide-over/Task Detail modal top out at z-[70], nested
 * confirmation dialogs at z-[90], the Toast at z-[100], the Projects/Config
 * overlay at z-[50]) — see BUG-004. This keeps the top bar clickable no
 * matter what is open on top of it. Overlays additionally offset their own
 * fixed backdrop/panel to start below `h-12` (`top-12`) so their own headers
 * don't get visually clipped by this one.
 */

import { useLocation, useNavigate } from "react-router-dom";
import { Settings, ChevronDown, FolderKanban, type LucideIcon } from "lucide-react";
import type { OverlayControls } from "@/shared/hooks/useOverlayStack";

/** The two app modes the top-bar app-switcher chooses between. */
type AppMode = "task-manager" | "sessions";

interface TopBarProps {
  /** Overlay stack + controls, owned by RootLayout and shared with OverlayHost. */
  overlay: OverlayControls;
}

/**
 * TopBar — app-switcher combobox + global Projects and Config overlay triggers.
 *
 * Renders inside RootLayout above the main outlet. Reads the current route
 * for the app-switcher's selected mode; receives the overlay stack as a prop
 * so its triggers can open Projects/Config and reflect whichever is active.
 */
export function TopBar({ overlay }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const mode: AppMode = location.pathname.startsWith("/sessions")
    ? "sessions"
    : "task-manager";

  function handleModeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = e.target.value as AppMode;
    navigate(selected === "sessions" ? "/sessions" : "/");
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

        {/* Right: global Projects + Config overlay triggers — always present in both modes */}
        <div className="flex items-center gap-1">
          <TopBarTrigger
            Icon={FolderKanban}
            label="Projects"
            isActive={overlay.state.kind === "projects"}
            onClick={overlay.openProjects}
          />
          <TopBarTrigger
            Icon={Settings}
            label="Config"
            ariaLabel="Go to Config"
            isActive={overlay.state.kind === "config"}
            onClick={overlay.openConfig}
          />
        </div>
      </div>
    </header>
  );
}

interface TopBarTriggerProps {
  /** Lucide icon component, imported by name at the call site. */
  Icon: LucideIcon;
  /** Visible label text. */
  label: string;
  /** Accessible name override; defaults to the visible label when omitted. */
  ariaLabel?: string;
  /** Whether this entry's overlay is currently open — drives the active-page indication. */
  isActive: boolean;
  /** Opens this entry's overlay. */
  onClick: () => void;
}

/**
 * Shared visual/behavioral contract for the top bar's persistent overlay
 * triggers (Projects, Config) — both use `aria-current="page"` while their
 * overlay is open and the same focus-visible ring.
 */
function TopBarTrigger({ Icon, label, ariaLabel, isActive, onClick }: TopBarTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-current={isActive ? "page" : undefined}
      className={[
        "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        isActive
          ? "font-medium text-brand-700"
          : "text-text-secondary hover:bg-surface-muted hover:text-text",
      ].join(" ")}
    >
      <Icon size={15} aria-hidden="true" />
      {label}
    </button>
  );
}
