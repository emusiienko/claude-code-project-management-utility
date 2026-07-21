/**
 * ProjectsPage — unit tests
 *
 * Covers the Close control (STORY-022 TASK-007, superseding the BUG-005
 * `navigate(-1)` Back button):
 * - Renders as "Close" (not "Back"), with an accessible name.
 * - Returns to the recorded last main view — a deep Task Manager URL is
 *   restored exactly, and a Sessions origin returns to Sessions.
 * - Falls back to "/" on a cold load with no recorded main view.
 * - Does not rely on browser history (no navigate(-1)).
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import ProjectsPage from "./ProjectsPage";
import { LAST_MAIN_VIEW_URL_KEY } from "@/shared/hooks/useLastMainViewUrl";

// ---------------------------------------------------------------------------
// Mocks — isolate ProjectsPage from TanStack Query
// ---------------------------------------------------------------------------

const mockUseProjectListFull = vi.fn();
const mockUseCreateProject = vi.fn();
const mockUseUpdateProject = vi.fn();
const mockUseDeleteProject = vi.fn();

vi.mock("./hooks/useProjects", () => ({
  useProjectListFull: () => mockUseProjectListFull(),
  useCreateProject: () => mockUseCreateProject(),
  useUpdateProject: () => mockUseUpdateProject(),
  useDeleteProject: () => mockUseDeleteProject(),
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderProjectsPage(initialPath = "/projects") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/projects" element={<ProjectsPage />} />
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
  mockUseProjectListFull.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
  });
  mockUseCreateProject.mockReturnValue({ mutate: vi.fn(), isPending: false });
  mockUseUpdateProject.mockReturnValue({ mutate: vi.fn(), isPending: false });
  mockUseDeleteProject.mockReturnValue({ mutate: vi.fn(), isPending: false });
});

afterEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProjectsPage close control", () => {
  it('renders a "Close" control, not "Back"', () => {
    renderProjectsPage();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^back$/i })).not.toBeInTheDocument();
  });

  it("has an accessible name describing the close-to-last-view behavior", () => {
    renderProjectsPage();
    const button = screen.getByRole("button", {
      name: "Close and return to the last view",
    });
    expect(button).toBeInTheDocument();
  });

  it("restores a deep Task Manager URL exactly when a Task Manager main view was recorded", () => {
    localStorage.setItem(
      LAST_MAIN_VIEW_URL_KEY,
      JSON.stringify("/projects/proj-abc/board"),
    );
    renderProjectsPage();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(screen.getByTestId("task-manager-board")).toBeInTheDocument();
  });

  it("returns to Sessions when a Sessions main view was recorded", () => {
    localStorage.setItem(LAST_MAIN_VIEW_URL_KEY, JSON.stringify("/sessions"));
    renderProjectsPage();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(screen.getByTestId("sessions-view")).toBeInTheDocument();
  });

  it("falls back to / on a cold load with no recorded main view", () => {
    renderProjectsPage();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(screen.getByTestId("root-redirect")).toBeInTheDocument();
  });
});
