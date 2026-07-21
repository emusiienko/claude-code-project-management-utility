/**
 * SettingsPage — unit tests
 *
 * Covers the STORY-016 restructure:
 * - /settings renders SystemSettings and no "Project Overrides" tab.
 * - Page heading and descriptive copy are present.
 * - The copy directs users to the project context for overrides.
 *
 * Also covers the Close control (STORY-022 TASK-007, superseding the
 * earlier `navigate(-1)` Back button):
 * - Renders as "Close" (not "Back"), with an accessible name.
 * - Returns to the recorded last main view — a deep Task Manager URL is
 *   restored exactly, and a Sessions origin returns to Sessions.
 * - Falls back to "/" on a cold load with no recorded main view.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import SettingsScreen from "./SettingsPage";
import { LAST_MAIN_VIEW_URL_KEY } from "@/shared/hooks/useLastMainViewUrl";

// ---------------------------------------------------------------------------
// Mock SystemSettings so we don't need a real query client
// ---------------------------------------------------------------------------

vi.mock("./components/SystemSettings", () => ({
  SystemSettings: () => (
    <section aria-label="System Settings">
      <div data-testid="system-settings-content">System Settings Content</div>
    </section>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSettingsPage() {
  return render(
    <MemoryRouter>
      <SettingsScreen />
    </MemoryRouter>,
  );
}

/**
 * Render SettingsScreen with real routes so the Close control's navigation
 * target can be observed (unlike renderSettingsPage, which has nowhere for
 * navigate() to land).
 */
function renderSettingsPageWithRoutes(initialPath = "/settings") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/settings" element={<SettingsScreen />} />
        <Route
          path="/projects/:projectId/board"
          element={<div data-testid="task-manager-board">Task Manager Board</div>}
        />
        <Route path="/sessions" element={<div data-testid="sessions-view">Sessions</div>} />
        <Route path="/" element={<div data-testid="root-redirect">Root</div>} />
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

describe("SettingsPage (STORY-016 restructure)", () => {
  it("renders the page heading", () => {
    renderSettingsPage();
    expect(
      screen.getByRole("heading", { name: "Settings", level: 1 }),
    ).toBeInTheDocument();
  });

  it("renders the SystemSettings component", () => {
    renderSettingsPage();
    expect(screen.getByTestId("system-settings-content")).toBeInTheDocument();
  });

  it("does NOT render a Project Overrides tab", () => {
    renderSettingsPage();
    expect(
      screen.queryByRole("tab", { name: /project overrides/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/project overrides/i),
    ).not.toBeInTheDocument();
  });

  it("does NOT render a System Defaults tab (flat page, no tab switcher)", () => {
    renderSettingsPage();
    expect(
      screen.queryByRole("tab", { name: /system defaults/i }),
    ).not.toBeInTheDocument();
  });

  it("shows copy directing users to the project context for overrides", () => {
    renderSettingsPage();
    // The copy mentions going to the project to manage overrides
    expect(screen.getByText(/project/i)).toBeInTheDocument();
  });
});

describe("SettingsPage close control (STORY-022 TASK-007)", () => {
  it('renders a "Close" control, not "Back"', () => {
    renderSettingsPage();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^back$/i })).not.toBeInTheDocument();
  });

  it("has an accessible name describing the close-to-last-view behavior", () => {
    renderSettingsPage();
    expect(
      screen.getByRole("button", { name: "Close and return to the last view" }),
    ).toBeInTheDocument();
  });

  it("restores a deep Task Manager URL exactly when a Task Manager main view was recorded", () => {
    localStorage.setItem(
      LAST_MAIN_VIEW_URL_KEY,
      JSON.stringify("/projects/proj-abc/board"),
    );
    renderSettingsPageWithRoutes();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(screen.getByTestId("task-manager-board")).toBeInTheDocument();
  });

  it("returns to Sessions when a Sessions main view was recorded", () => {
    localStorage.setItem(LAST_MAIN_VIEW_URL_KEY, JSON.stringify("/sessions"));
    renderSettingsPageWithRoutes();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(screen.getByTestId("sessions-view")).toBeInTheDocument();
  });

  it("falls back to / on a cold load with no recorded main view", () => {
    renderSettingsPageWithRoutes();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(screen.getByTestId("root-redirect")).toBeInTheDocument();
  });
});
