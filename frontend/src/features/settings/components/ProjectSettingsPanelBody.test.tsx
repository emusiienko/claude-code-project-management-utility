/**
 * ProjectSettingsPanelBody — unit tests (STORY-022 TASK-010 / TASK-011)
 *
 * `EffectiveSettingsPanel` (a TanStack Query consumer) is mocked so this
 * suite exercises only this panel body's own logic: the project-existence
 * states inherited from `useProjectDetail`, and the "Open in Task Manager"
 * forward bridge that resolves BUG-006 — no in-app path previously existed
 * from a project's Settings level to its own Stories/Board/Milestones for a
 * project not yet opened in Task Manager mode this session.
 *
 * Covers:
 * - Loading indicator while the project is being fetched.
 * - Not-found state when the project id doesn't resolve.
 * - Generic load-error state for non-404 errors.
 * - Renders the project name and the "Open in Task Manager" action once loaded.
 * - Clicking "Open in Task Manager" navigates to the project's Stories AND
 *   dismisses the overlay in the same action (BUG-006) — with no dependence
 *   on any previously recorded project or URL (a fresh project id works too).
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProjectSettingsPanelBody } from "./ProjectSettingsPanelBody";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/hooks/useProjectDetail", () => ({
  useProjectDetail: vi.fn(),
}));

vi.mock("./ProjectSettings", () => ({
  EffectiveSettingsPanel: ({ projectId }: { projectId: string }) => (
    <div>Effective settings for {projectId}</div>
  ),
}));

import { useProjectDetail } from "@/shared/hooks/useProjectDetail";
const mockUseProjectDetail = vi.mocked(useProjectDetail);

/** Exposes the current router pathname for navigation assertions. */
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

function renderPanel(projectId: string, onDismissOverlay = vi.fn()) {
  return {
    onDismissOverlay,
    ...render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <ProjectSettingsPanelBody
                  projectId={projectId}
                  onDismissOverlay={onDismissOverlay}
                />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    ),
  };
}

describe("ProjectSettingsPanelBody", () => {
  it("shows a loading indicator while the project is being fetched", () => {
    mockUseProjectDetail.mockReturnValue({
      project: undefined,
      isLoading: true,
      isNotFound: false,
      isError: false,
    });
    renderPanel("proj-1");
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("shows the not-found state for an unresolved project id", () => {
    mockUseProjectDetail.mockReturnValue({
      project: undefined,
      isLoading: false,
      isNotFound: true,
      isError: false,
    });
    renderPanel("nonexistent-id");
    expect(screen.getByText("Project not found.")).toBeInTheDocument();
  });

  it("shows a generic load-error state for a non-404 error", () => {
    mockUseProjectDetail.mockReturnValue({
      project: undefined,
      isLoading: false,
      isNotFound: false,
      isError: true,
    });
    renderPanel("proj-1");
    expect(screen.getByText("Could not load the project.")).toBeInTheDocument();
  });

  it("renders the project name and the settings editor once loaded", () => {
    mockUseProjectDetail.mockReturnValue({
      project: { id: "proj-1", name: "Alpha", description: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    renderPanel("proj-1");
    expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByText("Effective settings for proj-1")).toBeInTheDocument();
  });

  it('renders an "Open in Task Manager" action once loaded', () => {
    mockUseProjectDetail.mockReturnValue({
      project: { id: "proj-1", name: "Alpha", description: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    renderPanel("proj-1");
    expect(
      screen.getByRole("button", { name: /open in task manager/i }),
    ).toBeInTheDocument();
  });

  it("does not add a sub-navigation tab bar (single forward action, not a tab bar)", () => {
    mockUseProjectDetail.mockReturnValue({
      project: { id: "proj-1", name: "Alpha", description: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    renderPanel("proj-1");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Board" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Milestones" })).not.toBeInTheDocument();
  });

  it('clicking "Open in Task Manager" navigates to the project\'s Stories and dismisses the overlay in the same action (BUG-006)', async () => {
    mockUseProjectDetail.mockReturnValue({
      project: { id: "proj-1", name: "Alpha", description: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    const onDismissOverlay = vi.fn();
    renderPanel("proj-1", onDismissOverlay);

    await userEvent.click(screen.getByRole("button", { name: /open in task manager/i }));

    expect(screen.getByTestId("location-display")).toHaveTextContent(
      "/projects/proj-1/stories",
    );
    expect(onDismissOverlay).toHaveBeenCalledTimes(1);
  });

  it('works for a project not previously opened this session — no dependence on a stored project or URL (BUG-006 scenario)', async () => {
    // A project id that has never appeared in localStorage / any prior route —
    // the bridge must still resolve purely from its own `projectId` prop.
    mockUseProjectDetail.mockReturnValue({
      project: { id: "never-opened-before", name: "Fresh Project", description: null } as never,
      isLoading: false,
      isNotFound: false,
      isError: false,
    });
    const onDismissOverlay = vi.fn();
    renderPanel("never-opened-before", onDismissOverlay);

    await userEvent.click(screen.getByRole("button", { name: /open in task manager/i }));

    expect(screen.getByTestId("location-display")).toHaveTextContent(
      "/projects/never-opened-before/stories",
    );
    expect(onDismissOverlay).toHaveBeenCalledTimes(1);
  });
});
