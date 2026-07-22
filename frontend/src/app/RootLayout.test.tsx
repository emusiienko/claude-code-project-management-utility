/**
 * RootLayout — integration tests (STORY-022 Revision 3 / TASK-011)
 *
 * Exercises the real `useOverlayStack` + `TopBar` + `OverlayHost` wiring
 * together (unlike `TopBar.test.tsx` and `OverlayHost.test.tsx`, which test
 * each in isolation with a stub overlay). The heavy panel bodies
 * (ProjectsPanelBody, ProjectSettingsPanelBody, SystemSettings) are mocked —
 * this suite is about the shell composition, not their own content.
 *
 * Covers:
 * - Clicking the top-bar Projects entry opens the Projects overlay while the
 *   current main-view route (Sessions, or a deep project/story/task route)
 *   stays mounted and unchanged underneath.
 * - Clicking Config opens the Config overlay the same way.
 * - Dismiss clears the whole overlay and reveals the same main view unchanged.
 * - The top-bar entry shows aria-current="page" only while its own overlay is open.
 * - The app-switcher reflects the mode of the current route only — opening an
 *   overlay from Task Manager keeps it on "Task Manager"; from Sessions keeps
 *   it on "Sessions" — derived from the route, with no recorded URL involved.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RootLayout } from "./RootLayout";

// ---------------------------------------------------------------------------
// Mocks — panel bodies are content-only stand-ins; RootLayout's own wiring is
// what's under test here.
// ---------------------------------------------------------------------------

vi.mock("@/features/projects/components/ProjectsPanelBody", () => ({
  ProjectsPanelBody: () => <div>Projects list body</div>,
}));

vi.mock("@/features/settings/components/ProjectSettingsPanelBody", () => ({
  ProjectSettingsPanelBody: () => <div>Project settings body</div>,
}));

vi.mock("@/features/settings/components/SystemSettings", () => ({
  SystemSettings: () => <div>Config body</div>,
}));

// ---------------------------------------------------------------------------
// Helpers — a route tree shaped like router.tsx's main-view routes, deep
// enough to include a nested "story/task" style route.
// ---------------------------------------------------------------------------

function SessionsStub() {
  return <div>Sessions main view</div>;
}

function StoriesStub() {
  return (
    <div>
      Stories list
      <Outlet />
    </div>
  );
}

function StoryDetailStub() {
  return <div>Story slide-over content</div>;
}

function renderRootLayout(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route path="sessions" element={<SessionsStub />} />
          <Route path="projects/:projectId/stories" element={<StoriesStub />}>
            <Route path=":storyId" element={<StoryDetailStub />} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RootLayout — overlay over the main view", () => {
  it("opens the Projects overlay over Sessions without unmounting the Sessions main view", () => {
    renderRootLayout("/sessions");
    expect(screen.getByText("Sessions main view")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /projects/i }));

    expect(screen.getByText("Projects list body")).toBeInTheDocument();
    // The main view underneath is still mounted, unchanged.
    expect(screen.getByText("Sessions main view")).toBeInTheDocument();
  });

  it("opens the Config overlay over a deep story-detail route without unmounting it", () => {
    renderRootLayout("/projects/proj-1/stories/story-1");
    expect(screen.getByText("Stories list")).toBeInTheDocument();
    expect(screen.getByText("Story slide-over content")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Go to Config" }));

    expect(screen.getByText("Config body")).toBeInTheDocument();
    expect(screen.getByText("Stories list")).toBeInTheDocument();
    expect(screen.getByText("Story slide-over content")).toBeInTheDocument();
  });

  it("Dismiss clears the overlay and reveals the same deep route unchanged", () => {
    renderRootLayout("/projects/proj-1/stories/story-1");
    fireEvent.click(screen.getByRole("button", { name: /projects/i }));
    expect(screen.getByText("Projects list body")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss Projects panel" }));

    expect(screen.queryByText("Projects list body")).not.toBeInTheDocument();
    expect(screen.getByText("Story slide-over content")).toBeInTheDocument();
  });

  it("the Projects entry shows aria-current only while its own overlay is open, not while Config is open", () => {
    renderRootLayout("/sessions");
    const projectsButton = screen.getByRole("button", { name: /projects/i });
    const configButton = screen.getByRole("button", { name: "Go to Config" });

    expect(projectsButton).not.toHaveAttribute("aria-current");

    fireEvent.click(configButton);
    expect(configButton).toHaveAttribute("aria-current", "page");
    expect(projectsButton).not.toHaveAttribute("aria-current");

    fireEvent.click(projectsButton);
    expect(projectsButton).toHaveAttribute("aria-current", "page");
    expect(configButton).not.toHaveAttribute("aria-current");
  });
});

describe("RootLayout — app-switcher mode reflects the route only", () => {
  it("stays on Task Manager while the Projects overlay is opened from a project route", () => {
    renderRootLayout("/projects/proj-1/stories/story-1");
    fireEvent.click(screen.getByRole("button", { name: /projects/i }));

    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    expect(select.value).toBe("task-manager");
  });

  it("stays on Sessions while the Config overlay is opened from /sessions", () => {
    renderRootLayout("/sessions");
    fireEvent.click(screen.getByRole("button", { name: "Go to Config" }));

    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    expect(select.value).toBe("sessions");
  });
});
