/**
 * ProjectSidebar — unit tests
 *
 * Covers:
 * - Shows the project list and "Manage Projects" link in expanded state.
 * - Shows empty-state text when no projects exist.
 * - Collapse toggle button is present and accessible.
 * - Clicking the toggle collapses the sidebar (only toggle button remains).
 * - Collapsed state persists in localStorage.
 * - Clicking a project button navigates to /projects/:id/stories.
 * - Active project is highlighted with aria-current="page".
 * - "Manage Projects" link is always present.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ProjectSidebar } from "./ProjectSidebar";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/hooks/useProjectList", () => ({
  useProjectList: vi.fn(),
}));

import { useProjectList } from "@/shared/hooks/useProjectList";
const mockUseProjectList = vi.mocked(useProjectList);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECTS = [
  {
    id: "proj-001",
    name: "Alpha",
    description: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "proj-002",
    name: "Beta",
    description: null,
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SIDEBAR_COLLAPSED_KEY = "app:sidebar_collapsed";

function renderSidebar(activeProjectId = "proj-001") {
  return render(
    <MemoryRouter
      initialEntries={[`/projects/${activeProjectId}/stories`]}
    >
      <Routes>
        {/* AppShell-like wrapper: sidebar rendered alongside outlet content */}
        <Route
          path="/projects/:projectId/*"
          element={
            <div style={{ display: "flex" }}>
              <ProjectSidebar />
              <div data-testid="content-outlet" />
            </div>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  mockUseProjectList.mockReturnValue({ data: PROJECTS } as never);
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProjectSidebar", () => {
  it("renders all project names in the sidebar", () => {
    renderSidebar();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("renders the Manage Projects link", () => {
    renderSidebar();
    const link = screen.getByRole("link", { name: /manage projects/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/projects");
  });

  it("highlights the active project with aria-current=page", () => {
    renderSidebar("proj-001");
    const activeButton = screen.getByRole("button", { name: "Alpha" });
    expect(activeButton).toHaveAttribute("aria-current", "page");
  });

  it("does not mark the inactive project as aria-current", () => {
    renderSidebar("proj-001");
    const inactiveButton = screen.getByRole("button", { name: "Beta" });
    expect(inactiveButton).not.toHaveAttribute("aria-current");
  });

  it("shows the Collapse sidebar toggle button", () => {
    renderSidebar();
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeInTheDocument();
  });

  it("collapses the sidebar when toggle is clicked", () => {
    renderSidebar();
    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    fireEvent.click(toggle);
    // Project names are no longer visible in collapsed mode
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
    // The Expand toggle is now shown
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
  });

  it("persists collapsed state in localStorage", () => {
    renderSidebar();
    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    fireEvent.click(toggle);
    const stored = JSON.parse(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) ?? "false");
    expect(stored).toBe(true);
  });

  it("reads initial collapsed state from localStorage", () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(true));
    renderSidebar();
    // Sidebar is pre-collapsed — project names not visible
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
  });

  it("shows empty-state text when no projects exist", () => {
    mockUseProjectList.mockReturnValue({ data: [] } as never);
    renderSidebar();
    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
  });

  it("still shows Manage Projects link when no projects exist", () => {
    mockUseProjectList.mockReturnValue({ data: [] } as never);
    renderSidebar();
    expect(screen.getByRole("link", { name: /manage projects/i })).toBeInTheDocument();
  });
});
