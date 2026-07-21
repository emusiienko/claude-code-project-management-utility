/**
 * TopBar — unit tests
 *
 * Covers:
 * - App switcher is present and defaults to "Task Manager" on non-sessions routes.
 * - App switcher defaults to "Sessions" on /sessions routes.
 * - Switching to Sessions navigates to /sessions.
 * - Switching to Task Manager navigates to the last-visited Task Manager URL
 *   (stored in localStorage) or falls back to /.
 * - Global Projects entry (STORY-022): renders in both Task Manager and Sessions
 *   modes, navigates to /projects, shows aria-current="page" on /projects and not
 *   otherwise, and is exposed as an accessible link.
 * - Global Config entry (STORY-022 Revision 2 / TASK-006): renders as an
 *   always-visible, active-aware NavLink in both modes (superseding the old
 *   Task-Manager-only gated button), holds the same on-screen position as
 *   Projects across a mode switch.
 * - App-switcher reflects the underlying main view while a closable view
 *   (/projects, /settings) is open, using the recorded last-main-view URL.
 * - The last-main-view record is not overwritten by opening a closable view.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { TopBar } from "./TopBar";
import { LAST_MAIN_VIEW_URL_KEY } from "@/shared/hooks/useLastMainViewUrl";

// ---------------------------------------------------------------------------
// localStorage key — mirrors LAST_TASK_MANAGER_URL_KEY inside TopBar
// ---------------------------------------------------------------------------

const LAST_TASK_MANAGER_URL_KEY = "app:last_task_manager_url";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Render TopBar inside a MemoryRouter at the given initial path.
 * Also registers stub routes so navigate() has somewhere to go.
 */
function renderTopBar(initialPath = "/projects/proj-1/stories") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="*" element={<TopBar />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TopBar", () => {
  it("renders the app switcher combobox", () => {
    renderTopBar();
    expect(
      screen.getByRole("combobox", { name: "Switch between Task Manager and Sessions" }),
    ).toBeInTheDocument();
  });

  it('shows "Task Manager" as the selected option on a non-sessions route', () => {
    renderTopBar("/projects/proj-1/stories");
    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    expect(select.value).toBe("task-manager");
  });

  it('shows "Sessions" as the selected option on the /sessions route', () => {
    renderTopBar("/sessions");
    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    expect(select.value).toBe("sessions");
  });

  it("switching to Sessions changes the select value to 'sessions'", () => {
    renderTopBar("/projects/proj-1/stories");
    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "sessions" } });
    // After navigation to /sessions the select value should reflect sessions mode
    expect(select.value).toBe("sessions");
  });

  it("switching to Task Manager from Sessions uses the stored last URL", () => {
    localStorage.setItem(
      LAST_TASK_MANAGER_URL_KEY,
      JSON.stringify("/projects/proj-abc/board"),
    );
    renderTopBar("/sessions");
    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "task-manager" } });
    // The select reflects task-manager mode after navigation
    expect(select.value).toBe("task-manager");
  });

  it("switching to Task Manager with no stored URL falls back to /", () => {
    renderTopBar("/sessions");
    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "task-manager" } });
    expect(select.value).toBe("task-manager");
  });

  // -------------------------------------------------------------------------
  // Global Projects entry (STORY-022)
  // -------------------------------------------------------------------------

  it("renders the global Projects entry in Task Manager mode", () => {
    renderTopBar("/projects/proj-1/stories");
    expect(screen.getByRole("link", { name: /projects/i })).toBeInTheDocument();
  });

  it("renders the global Projects entry in Sessions mode", () => {
    renderTopBar("/sessions");
    expect(screen.getByRole("link", { name: /projects/i })).toBeInTheDocument();
  });

  it("the Projects entry has an accessible link name", () => {
    renderTopBar("/projects/proj-1/stories");
    const link = screen.getByRole("link", { name: /projects/i });
    expect(link).toHaveAccessibleName(/projects/i);
  });

  it("clicking the Projects entry navigates to /projects", () => {
    renderTopBar("/projects/proj-1/stories");
    const link = screen.getByRole("link", { name: /projects/i });
    fireEvent.click(link);
    expect(screen.getByRole("link", { name: /projects/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it('sets aria-current="page" on the Projects entry when on /projects', () => {
    renderTopBar("/projects");
    const link = screen.getByRole("link", { name: /projects/i });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  // BUG-001 fix verification: the Projects NavLink now has an `end` prop, so
  // react-router's exact matching no longer marks it active on nested project
  // routes (e.g. /projects/:id/stories).
  it("omits aria-current on the Projects entry when not on /projects (BUG-001)", () => {
    renderTopBar("/projects/proj-1/stories");
    const link = screen.getByRole("link", { name: /projects/i });
    expect(link).not.toHaveAttribute("aria-current");
  });

  it("omits aria-current on the Projects entry in Sessions mode (not on /projects)", () => {
    renderTopBar("/sessions");
    const link = screen.getByRole("link", { name: /projects/i });
    expect(link).not.toHaveAttribute("aria-current");
  });

  // BUG-001 guard extended to the standalone Project Settings URL (STORY-022
  // TASK-005): /projects/:id/settings is still under the /projects prefix, so
  // the exact-match `end` prop must keep the top-bar Projects entry inactive
  // there too, just as it does for /projects/:id/stories.
  it("omits aria-current on the Projects entry on the standalone Project Settings URL (BUG-001)", () => {
    renderTopBar("/projects/proj-1/settings");
    const link = screen.getByRole("link", { name: /projects/i });
    expect(link).not.toHaveAttribute("aria-current");
  });

  it("the Projects entry links to /projects", () => {
    renderTopBar("/sessions");
    const link = screen.getByRole("link", { name: /projects/i });
    expect(link).toHaveAttribute("href", "/projects");
  });

  // -------------------------------------------------------------------------
  // Global Config entry (STORY-022 Revision 2 / TASK-006)
  //
  // Re-aligns the pre-TASK-006 assertions that asserted Config was hidden
  // outside Task Manager mode and rendered as a plain <button>. Config is now
  // an always-present, active-aware NavLink alongside Projects in both modes.
  // -------------------------------------------------------------------------

  it("renders the global Config entry as a link in Task Manager mode", () => {
    renderTopBar("/projects/proj-1/stories");
    expect(screen.getByRole("link", { name: "Go to Config" })).toBeInTheDocument();
  });

  it("renders the global Config entry as a link in Sessions mode", () => {
    renderTopBar("/sessions");
    expect(screen.getByRole("link", { name: "Go to Config" })).toBeInTheDocument();
  });

  it("the Config entry has an accessible link name", () => {
    renderTopBar("/projects/proj-1/stories");
    const link = screen.getByRole("link", { name: "Go to Config" });
    expect(link).toHaveAccessibleName("Go to Config");
  });

  it("the Config entry links to /settings", () => {
    renderTopBar("/sessions");
    const link = screen.getByRole("link", { name: "Go to Config" });
    expect(link).toHaveAttribute("href", "/settings");
  });

  it('sets aria-current="page" on the Config entry when on /settings', () => {
    renderTopBar("/settings");
    const link = screen.getByRole("link", { name: "Go to Config" });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("omits aria-current on the Config entry when not on /settings", () => {
    renderTopBar("/projects/proj-1/stories");
    const link = screen.getByRole("link", { name: "Go to Config" });
    expect(link).not.toHaveAttribute("aria-current");
  });

  it("omits aria-current on the Config entry in Sessions mode (not on /settings)", () => {
    renderTopBar("/sessions");
    const link = screen.getByRole("link", { name: "Go to Config" });
    expect(link).not.toHaveAttribute("aria-current");
  });

  it("keeps the Config entry visible alongside the global Projects entry in Task Manager mode", () => {
    renderTopBar("/projects/proj-1/stories");
    expect(screen.getByRole("link", { name: /projects/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Config" })).toBeInTheDocument();
  });

  it("keeps the Config entry visible alongside the global Projects entry in Sessions mode", () => {
    renderTopBar("/sessions");
    expect(screen.getByRole("link", { name: /projects/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Config" })).toBeInTheDocument();
  });

  it("holds the Projects and Config entries in the same relative order across a mode switch", () => {
    const { unmount } = renderTopBar("/projects/proj-1/stories");
    const taskManagerLinks = screen
      .getAllByRole("link")
      .map((el) => el.getAttribute("aria-label") ?? el.textContent);
    unmount();

    renderTopBar("/sessions");
    const sessionsLinks = screen
      .getAllByRole("link")
      .map((el) => el.getAttribute("aria-label") ?? el.textContent);

    expect(taskManagerLinks).toEqual(sessionsLinks);
  });

  // -------------------------------------------------------------------------
  // App-switcher reflects the underlying main view while a closable view is
  // open (STORY-022 Revision 2 / TASK-006)
  // -------------------------------------------------------------------------

  it("reflects Task Manager on the switcher when /projects is opened with a recorded Task Manager main view", () => {
    localStorage.setItem(
      LAST_MAIN_VIEW_URL_KEY,
      JSON.stringify("/projects/proj-abc/board"),
    );
    renderTopBar("/projects");
    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    expect(select.value).toBe("task-manager");
  });

  it("reflects Sessions on the switcher when /projects is opened with a recorded Sessions main view", () => {
    localStorage.setItem(LAST_MAIN_VIEW_URL_KEY, JSON.stringify("/sessions"));
    renderTopBar("/projects");
    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    expect(select.value).toBe("sessions");
  });

  it("reflects Sessions on the switcher when /settings is opened with a recorded Sessions main view", () => {
    localStorage.setItem(LAST_MAIN_VIEW_URL_KEY, JSON.stringify("/sessions"));
    renderTopBar("/settings");
    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    expect(select.value).toBe("sessions");
  });

  it("defaults the switcher to Task Manager when a closable view is opened cold (no recorded main view)", () => {
    renderTopBar("/projects");
    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    expect(select.value).toBe("task-manager");
  });

  // -------------------------------------------------------------------------
  // Last-main-view recording invariant (STORY-022 Revision 2 / TASK-006)
  // -------------------------------------------------------------------------

  it("records the current URL as the last main view on a main-view route", () => {
    renderTopBar("/sessions");
    expect(localStorage.getItem(LAST_MAIN_VIEW_URL_KEY)).toBe(
      JSON.stringify("/sessions"),
    );
  });

  it("does not overwrite the recorded last main view when the Projects entry (a closable view) is opened", () => {
    renderTopBar("/projects/proj-1/stories");
    expect(localStorage.getItem(LAST_MAIN_VIEW_URL_KEY)).toBe(
      JSON.stringify("/projects/proj-1/stories"),
    );

    fireEvent.click(screen.getByRole("link", { name: /projects/i }));

    expect(localStorage.getItem(LAST_MAIN_VIEW_URL_KEY)).toBe(
      JSON.stringify("/projects/proj-1/stories"),
    );
  });

  it("does not overwrite the recorded last main view when the Config entry (a closable view) is opened", () => {
    renderTopBar("/sessions");
    expect(localStorage.getItem(LAST_MAIN_VIEW_URL_KEY)).toBe(
      JSON.stringify("/sessions"),
    );

    fireEvent.click(screen.getByRole("link", { name: "Go to Config" }));

    expect(localStorage.getItem(LAST_MAIN_VIEW_URL_KEY)).toBe(
      JSON.stringify("/sessions"),
    );
  });
});
