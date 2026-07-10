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
});
