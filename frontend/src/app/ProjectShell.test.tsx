/**
 * ProjectShell — unit tests
 *
 * Covers:
 * - Sub-nav renders four tabs (Stories, Board, Milestones, Settings) when the
 *   project is found.
 * - Inline "Not found" message + link back to /projects when the project is not found.
 * - Loading spinner while the project is being fetched.
 * - Generic load-error message for non-404 API errors.
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
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

function renderProjectShell(projectId = "proj-123") {
  return render(
    <MemoryRouter initialEntries={[`/projects/${projectId}/stories`]}>
      <Routes>
        <Route path="/projects/:projectId/*" element={<ProjectShell />} />
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

  it("renders all four sub-nav tabs when the project exists", () => {
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
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
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
