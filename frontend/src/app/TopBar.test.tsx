/**
 * TopBar — unit tests
 *
 * Covers:
 * - App switcher is present and defaults to "Task Manager" on non-sessions routes.
 * - App switcher defaults to "Sessions" on /sessions routes.
 * - Settings button is visible in Task Manager mode.
 * - Settings button is hidden in Sessions mode.
 * - Switching to Sessions navigates to /sessions.
 * - Switching to Task Manager navigates to the last-visited Task Manager URL
 *   (stored in localStorage) or falls back to /.
 * - Global Projects entry (STORY-022): renders in both Task Manager and Sessions
 *   modes, navigates to /projects, shows aria-current="page" on /projects and not
 *   otherwise, and is exposed as an accessible link.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { TopBar } from "./TopBar";

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

  it("shows the Settings button in Task Manager mode", () => {
    renderTopBar("/projects/proj-1/stories");
    expect(screen.getByRole("button", { name: "Go to Config" })).toBeInTheDocument();
  });

  it("hides the Settings button in Sessions mode", () => {
    renderTopBar("/sessions");
    expect(screen.queryByRole("button", { name: "Go to Config" })).not.toBeInTheDocument();
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

  it("keeps the Settings button visible alongside the global Projects entry in Task Manager mode", () => {
    renderTopBar("/projects/proj-1/stories");
    expect(screen.getByRole("link", { name: /projects/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to Config" })).toBeInTheDocument();
  });

  it("keeps the Settings button hidden while the global Projects entry stays visible in Sessions mode", () => {
    renderTopBar("/sessions");
    expect(screen.getByRole("link", { name: /projects/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to Config" })).not.toBeInTheDocument();
  });
});
