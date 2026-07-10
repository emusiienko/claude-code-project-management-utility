/**
 * ProjectSettingsPage — unit tests
 *
 * Covers the STORY-016 restructure:
 * - /projects/:id/settings renders the "Project Settings" heading.
 * - EffectiveSettingsPanel is rendered (via mock) with the project ID from the route.
 * - Descriptive copy about overrides is present.
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ProjectSettingsPage from "./ProjectSettingsPage";

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
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProjectSettingsPage (STORY-016 restructure)", () => {
  it("renders the Project Settings heading", () => {
    renderProjectSettingsPage();
    expect(
      screen.getByRole("heading", { name: "Project Settings", level: 2 }),
    ).toBeInTheDocument();
  });

  it("renders the EffectiveSettingsPanel", () => {
    renderProjectSettingsPage();
    expect(screen.getByTestId("effective-settings-panel")).toBeInTheDocument();
  });

  it("passes the project ID from the route to EffectiveSettingsPanel", () => {
    renderProjectSettingsPage("proj-abc");
    const panel = screen.getByTestId("effective-settings-panel");
    expect(panel).toHaveAttribute("data-project-id", "proj-abc");
  });

  it("shows descriptive copy mentioning overrides", () => {
    renderProjectSettingsPage();
    expect(screen.getByText(/override/i)).toBeInTheDocument();
  });
});
