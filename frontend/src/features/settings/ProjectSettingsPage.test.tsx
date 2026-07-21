/**
 * ProjectSettingsPage — unit tests
 *
 * Covers the STORY-022 TASK-004 standalone-screen promotion:
 * - Project-named heading (h1) + "Project Settings" heading (h2).
 * - Back-link to /projects.
 * - EffectiveSettingsPanel is rendered (via mock) with the project ID from the route.
 * - Descriptive copy about overrides is present.
 * - No per-project sub-nav tab bar renders around the page (it is a standalone
 *   screen, not tab content inside ProjectShell).
 * - Not-found / load-error / loading states for an unresolved project id, mirroring
 *   the handling ProjectShell used to provide while Settings was a tab.
 *
 * useProjectDetail is mocked directly (matching the ProjectShell.test.tsx pattern)
 * so these tests do not depend on a QueryClientProvider or real network calls.
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ProjectSettingsPage from "./ProjectSettingsPage";

// ---------------------------------------------------------------------------
// Mock useProjectDetail
// ---------------------------------------------------------------------------

vi.mock("@/shared/hooks/useProjectDetail", () => ({
  useProjectDetail: vi.fn(),
}));

import { useProjectDetail } from "@/shared/hooks/useProjectDetail";
const mockUseProjectDetail = vi.mocked(useProjectDetail);

// ---------------------------------------------------------------------------
// Mock EffectiveSettingsPanel to avoid the full settings query chain
// ---------------------------------------------------------------------------

vi.mock("./components/ProjectSettings", () => ({
  EffectiveSettingsPanel: ({ projectId }: { projectId: string }) => (
    <div data-testid="effective-settings-panel" data-project-id={projectId}>
      Effective Settings Panel
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderProjectSettingsPage(projectId = "proj-123") {
  return render(
    <MemoryRouter initialEntries={[`/projects/${projectId}/settings`]}>
      <Routes>
        <Route
          path="/projects/:projectId/settings"
          element={<ProjectSettingsPage />}
        />
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

describe("ProjectSettingsPage (STORY-022 standalone screen)", () => {
  it("shows a loading indicator while fetching the project", () => {
    mockUseProjectDetail.mockReturnValue({
      project: undefined,
      isLoading: true,
      isNotFound: false,
      isError: false,
    });
    renderProjectSettingsPage();
    const loader = screen.getByRole("status");
    expect(loader).toHaveAttribute("aria-busy", "true");
  });

  it("renders a heading with the project's name", () => {
    mockUseProjectDetail.mockReturnValue({
      project: { id: "proj-123", name: "Delta", settings: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    renderProjectSettingsPage();
    expect(
      screen.getByRole("heading", { name: "Delta", level: 1 }),
    ).toBeInTheDocument();
  });

  it('renders the "Project Settings" heading', () => {
    mockUseProjectDetail.mockReturnValue({
      project: { id: "proj-123", name: "Delta", settings: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    renderProjectSettingsPage();
    expect(
      screen.getByRole("heading", { name: "Project Settings", level: 2 }),
    ).toBeInTheDocument();
  });

  it("renders a back-link that returns to /projects", () => {
    mockUseProjectDetail.mockReturnValue({
      project: { id: "proj-123", name: "Delta", settings: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    renderProjectSettingsPage();
    const backLink = screen.getByRole("link", { name: /back to projects/i });
    expect(backLink).toHaveAttribute("href", "/projects");
  });

  it("renders the EffectiveSettingsPanel", () => {
    mockUseProjectDetail.mockReturnValue({
      project: { id: "proj-123", name: "Delta", settings: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    renderProjectSettingsPage();
    expect(screen.getByTestId("effective-settings-panel")).toBeInTheDocument();
  });

  it("passes the project ID from the route to EffectiveSettingsPanel", () => {
    mockUseProjectDetail.mockReturnValue({
      project: { id: "proj-abc", name: "Delta", settings: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    renderProjectSettingsPage("proj-abc");
    const panel = screen.getByTestId("effective-settings-panel");
    expect(panel).toHaveAttribute("data-project-id", "proj-abc");
  });

  it("shows descriptive copy mentioning overrides", () => {
    mockUseProjectDetail.mockReturnValue({
      project: { id: "proj-123", name: "Delta", settings: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    renderProjectSettingsPage();
    expect(screen.getByText(/override/i)).toBeInTheDocument();
  });

  it("does not render a per-project sub-nav tab bar (standalone screen, not a tab)", () => {
    mockUseProjectDetail.mockReturnValue({
      project: { id: "proj-123", name: "Delta", settings: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    renderProjectSettingsPage();
    expect(
      screen.queryByRole("navigation", { name: "Project sections" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Stories" })).not.toBeInTheDocument();
  });

  it("shows the not-found state for an unresolved project id", () => {
    mockUseProjectDetail.mockReturnValue({
      project: undefined,
      isLoading: false,
      isNotFound: true,
      isError: false,
    });
    renderProjectSettingsPage("nonexistent-id");
    expect(screen.getByText("Project not found.")).toBeInTheDocument();
  });

  it("shows a load-error message for non-404 errors", () => {
    mockUseProjectDetail.mockReturnValue({
      project: undefined,
      isLoading: false,
      isNotFound: false,
      isError: true,
    });
    renderProjectSettingsPage();
    expect(screen.getByText("Could not load the project.")).toBeInTheDocument();
  });
});
