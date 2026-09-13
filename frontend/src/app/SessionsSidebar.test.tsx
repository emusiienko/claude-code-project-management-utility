/**
 * SessionsSidebar — unit tests
 *
 * Net-new file — SessionsSidebar had no co-located test before this task.
 * Mirrors ProjectSidebar.test.tsx's structure, adjusted for Sessions-mode
 * routing and copy. Covers:
 * - Shows the project list in expanded state.
 * - Shows empty-state text when no projects exist.
 * - Collapse toggle button is present and accessible.
 * - Clicking the toggle calls `onToggleCollapse` (collapsed state itself is
 *   owned by SessionsShell — see SessionsShell.test.tsx for the collapse/
 *   localStorage/separator wiring).
 * - Clicking a project button navigates to /sessions/:id.
 * - Active project is highlighted with aria-current="page".
 * - Renders the given pixel `width` as an inline style, falling back to the
 *   `w-60` class when `width` is `null`.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SessionsSidebar, type SessionsSidebarProps } from "./SessionsSidebar";

/** Exposes the current router pathname for navigation assertions. */
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

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

function renderSidebar(
  activeProjectId = "proj-001",
  overrides: Partial<SessionsSidebarProps> = {},
) {
  const onToggleCollapse = vi.fn();
  const props: SessionsSidebarProps = {
    id: "sessions-sidebar",
    width: null,
    collapsed: false,
    onToggleCollapse,
    ...overrides,
  };

  const utils = render(
    <MemoryRouter initialEntries={[`/sessions/${activeProjectId}`]}>
      <Routes>
        {/* SessionsShell-like wrapper: sidebar rendered alongside outlet content */}
        <Route
          path="/sessions/:projectId"
          element={
            <div style={{ display: "flex" }}>
              <SessionsSidebar {...props} />
              <div data-testid="content-outlet" />
              <LocationDisplay />
            </div>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

  return { ...utils, onToggleCollapse };
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

describe("SessionsSidebar", () => {
  it("renders all project names in the sidebar", () => {
    renderSidebar();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("navigates to the project's session list when a project is selected from the list", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Beta" }));
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      "/sessions/proj-002",
    );
  });

  it("records the selected project under the Sessions-scoped last-visited key", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Beta" }));
    expect(
      JSON.parse(localStorage.getItem("app:last_session_project_id") ?? "null"),
    ).toBe("proj-002");
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

  it("applies the given id to the sidebar's root element", () => {
    renderSidebar("proj-001", { id: "custom-sessions-sidebar-id" });
    expect(
      screen.getByRole("complementary", { name: "Sessions project sidebar" }),
    ).toHaveAttribute("id", "custom-sessions-sidebar-id");
  });

  it("renders the given pixel width as an inline style", () => {
    renderSidebar("proj-001", { width: 300 });
    expect(
      screen.getByRole("complementary", { name: "Sessions project sidebar" }),
    ).toHaveStyle({ width: "300px" });
  });

  it("falls back to the w-60 class and no inline width when width is null", () => {
    renderSidebar("proj-001", { width: null });
    const aside = screen.getByRole("complementary", {
      name: "Sessions project sidebar",
    });
    expect(aside.className).toContain("w-60");
    expect(aside).not.toHaveStyle({ width: "300px" });
  });

  it("shows the Collapse sidebar toggle button", () => {
    renderSidebar();
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeInTheDocument();
  });

  it("calls onToggleCollapse when the toggle is clicked", () => {
    const { onToggleCollapse } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it("renders only the toggle button when collapsed is true", () => {
    renderSidebar("proj-001", { collapsed: true });
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
  });

  it("calls onToggleCollapse when the expand toggle is clicked while collapsed", () => {
    const { onToggleCollapse } = renderSidebar("proj-001", { collapsed: true });
    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it("shows empty-state text when no projects exist", () => {
    mockUseProjectList.mockReturnValue({ data: [] } as never);
    renderSidebar();
    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
  });
});
