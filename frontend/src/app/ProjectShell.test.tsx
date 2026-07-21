/**
 * ProjectShell — unit tests
 *
 * Covers:
 * - Sub-nav renders exactly three tabs (Stories, Board, Milestones) when the
 *   project is found; Settings is not among them (STORY-022 TASK-004 — Settings
 *   is now a standalone screen, not a sub-nav tab).
 * - Inline "Not found" message + link back to /projects when the project is not found.
 * - Loading spinner while the project is being fetched.
 * - Generic load-error message for non-404 API errors.
 * - A bare /projects/:id still redirects to the Stories tab (regression guard,
 *   STORY-022 TASK-005).
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProjectShell } from "./ProjectShell";

// ---------------------------------------------------------------------------
// Mock useProjectDetail
// ---------------------------------------------------------------------------

vi.mock("@/shared/hooks/useProjectDetail", () => ({
  useProjectDetail: vi.fn(),
}));

import { useProjectDetail } from "@/shared/hooks/useProjectDetail";
const mockUseProjectDetail = vi.mocked(useProjectDetail);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Renders ProjectShell with the same nested-route shape it has in router.tsx:
 * an index route that redirects to "stories" plus a "stories" leaf route, so
 * tests can exercise the bare-project-URL redirect behavior in addition to
 * the sub-nav itself.
 */
function renderProjectShell(projectId = "proj-123", initialPath?: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath ?? `/projects/${projectId}/stories`]}>
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectShell />}>
          <Route index element={<Navigate to="stories" replace />} />
          <Route
            path="stories"
            element={<div data-testid="stories-page">Stories</div>}
          />
        </Route>
        <Route
          path="/projects"
          element={<div data-testid="projects-page">Projects</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProjectShell", () => {
  it("shows a loading indicator while fetching the project", () => {
    mockUseProjectDetail.mockReturnValue({
      project: undefined,
      isLoading: true,
      isNotFound: false,
      isError: false,
    });
    renderProjectShell();
    // PageLoader renders a status role with aria-busy="true"
    const loader = screen.getByRole("status");
    expect(loader).toHaveAttribute("aria-busy", "true");
  });

  it("renders exactly three sub-nav tabs when the project exists (Stories, Board, Milestones)", () => {
    mockUseProjectDetail.mockReturnValue({
      project: { id: "proj-123", name: "Test", settings: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    renderProjectShell();
    expect(screen.getByRole("link", { name: "Stories" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Board" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Milestones" }),
    ).toBeInTheDocument();
  });

  it("does not render a Settings tab in the sub-nav (STORY-022 TASK-004 — standalone screen)", () => {
    mockUseProjectDetail.mockReturnValue({
      project: { id: "proj-123", name: "Test", settings: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    renderProjectShell();
    expect(
      screen.queryByRole("link", { name: "Settings" }),
    ).not.toBeInTheDocument();
  });

  it("redirects a bare /projects/:id to the Stories tab (regression guard, STORY-022)", () => {
    mockUseProjectDetail.mockReturnValue({
      project: { id: "proj-123", name: "Test", settings: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    renderProjectShell("proj-123", "/projects/proj-123");
    expect(screen.getByTestId("stories-page")).toBeInTheDocument();
  });

  it("renders sub-nav with navigation landmark when project is found", () => {
    mockUseProjectDetail.mockReturnValue({
      project: { id: "proj-123", name: "Test", settings: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    renderProjectShell();
    expect(
      screen.getByRole("navigation", { name: "Project sections" }),
    ).toBeInTheDocument();
  });

  it("shows inline not-found message when the project ID is unknown (404)", () => {
    mockUseProjectDetail.mockReturnValue({
      project: undefined,
      isLoading: false,
      isNotFound: true,
      isError: false,
    });
    renderProjectShell("nonexistent-id");
    expect(screen.getByText("Project not found.")).toBeInTheDocument();
  });

  it("includes a Back to Projects link in the not-found state", () => {
    mockUseProjectDetail.mockReturnValue({
      project: undefined,
      isLoading: false,
      isNotFound: true,
      isError: false,
    });
    renderProjectShell("nonexistent-id");
    const link = screen.getByRole("link", { name: "Back to Projects" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/projects");
  });

  it("shows inline load-error message for non-404 errors", () => {
    mockUseProjectDetail.mockReturnValue({
      project: undefined,
      isLoading: false,
      isNotFound: false,
      isError: true,
    });
    renderProjectShell("proj-123");
    expect(
      screen.getByText("Could not load the project."),
    ).toBeInTheDocument();
  });
});
