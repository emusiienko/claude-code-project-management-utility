/**
 * TopBar — unit tests
 *
 * Rewritten for STORY-022 Revision 3 (TASK-009/TASK-011): Projects and Config
 * are no longer route `NavLink`s — they are `<button>` overlay triggers that
 * call `overlay.openProjects()` / `overlay.openConfig()`, and their active
 * indication (`aria-current="page"`) is driven purely by `overlay.state.kind`,
 * not by route matching. The app-switcher derives its mode from the current
 * route only — no closable-view classification, no last-main-view recording.
 *
 * Covers:
 * - App switcher is present and defaults to "Task Manager" on non-sessions routes.
 * - App switcher defaults to "Sessions" on /sessions routes.
 * - Switching to Sessions navigates to /sessions.
 * - Switching to Task Manager navigates to "/" (RootRedirect resolves the target).
 * - Projects/Config entries render as buttons (not links) in both modes.
 * - Clicking Projects calls overlay.openProjects(); clicking Config calls overlay.openConfig().
 * - aria-current="page" tracks overlay.state.kind, independent of the current route.
 * - Both entries hold the same relative position across a mode switch (BUG-003 regression).
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { TopBar } from "./TopBar";
import type { OverlayControls, OverlayState } from "@/shared/hooks/useOverlayStack";

/** Exposes the current router pathname for navigation assertions. */
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

/** Builds a minimal OverlayControls stub with the given active state. */
function makeOverlay(kind: OverlayState["kind"] = "none"): OverlayControls {
  const state: OverlayState =
    kind === "projects"
      ? { kind: "projects", stack: [{ screen: "list" }] }
      : kind === "config"
        ? { kind: "config" }
        : { kind: "none" };

  return {
    state,
    openProjects: vi.fn(),
    openConfig: vi.fn(),
    openProjectSettings: vi.fn(),
    back: vi.fn(),
    dismiss: vi.fn(),
  };
}

/**
 * Render TopBar inside a MemoryRouter at the given initial path, with a
 * stub route table so navigate() has somewhere to go and its result is
 * observable via LocationDisplay.
 */
function renderTopBar(overlay: OverlayControls, initialPath = "/projects/proj-1/stories") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <TopBar overlay={overlay} />
              <LocationDisplay />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// App switcher — mode derived from the current route only
// ---------------------------------------------------------------------------

describe("TopBar — app switcher", () => {
  it("renders the app switcher combobox", () => {
    renderTopBar(makeOverlay());
    expect(
      screen.getByRole("combobox", { name: "Switch between Task Manager and Sessions" }),
    ).toBeInTheDocument();
  });

  it('shows "Task Manager" as the selected option on a non-sessions route', () => {
    renderTopBar(makeOverlay(), "/projects/proj-1/stories");
    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    expect(select.value).toBe("task-manager");
  });

  it('shows "Sessions" as the selected option on the /sessions route', () => {
    renderTopBar(makeOverlay(), "/sessions");
    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    expect(select.value).toBe("sessions");
  });

  it("switching to Sessions navigates to /sessions", () => {
    renderTopBar(makeOverlay(), "/projects/proj-1/stories");
    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "sessions" } });
    expect(screen.getByTestId("location-display")).toHaveTextContent("/sessions");
  });

  it('switching to Task Manager navigates to "/" (no last-main-view lookup)', () => {
    renderTopBar(makeOverlay(), "/sessions");
    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "task-manager" } });
    expect(screen.getByTestId("location-display")).toHaveTextContent("/");
  });

  it("mode reflects the route only — an overlay being open does not change the switcher value", () => {
    renderTopBar(makeOverlay("projects"), "/sessions");
    const select = screen.getByRole("combobox", {
      name: "Switch between Task Manager and Sessions",
    }) as HTMLSelectElement;
    expect(select.value).toBe("sessions");
  });
});

// ---------------------------------------------------------------------------
// Global Projects trigger (STORY-022 Revision 3)
// ---------------------------------------------------------------------------

describe("TopBar — Projects overlay trigger", () => {
  it("renders the Projects entry as a button (not a route link) in Task Manager mode", () => {
    renderTopBar(makeOverlay(), "/projects/proj-1/stories");
    expect(screen.getByRole("button", { name: /projects/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /projects/i })).not.toBeInTheDocument();
  });

  it("renders the Projects entry as a button in Sessions mode", () => {
    renderTopBar(makeOverlay(), "/sessions");
    expect(screen.getByRole("button", { name: /projects/i })).toBeInTheDocument();
  });

  it("clicking the Projects entry calls overlay.openProjects()", () => {
    const overlay = makeOverlay();
    renderTopBar(overlay, "/projects/proj-1/stories");
    fireEvent.click(screen.getByRole("button", { name: /projects/i }));
    expect(overlay.openProjects).toHaveBeenCalledTimes(1);
  });

  it('sets aria-current="page" on the Projects entry when its overlay is open', () => {
    renderTopBar(makeOverlay("projects"));
    const button = screen.getByRole("button", { name: /projects/i });
    expect(button).toHaveAttribute("aria-current", "page");
  });

  it("omits aria-current on the Projects entry when no overlay is open", () => {
    renderTopBar(makeOverlay("none"));
    const button = screen.getByRole("button", { name: /projects/i });
    expect(button).not.toHaveAttribute("aria-current");
  });

  it("omits aria-current on the Projects entry when the Config overlay is open instead", () => {
    renderTopBar(makeOverlay("config"));
    const button = screen.getByRole("button", { name: /projects/i });
    expect(button).not.toHaveAttribute("aria-current");
  });

  // The route no longer drives active state at all — opening Projects from
  // Sessions still marks it active, since the mechanism is overlay.state.kind.
  it('sets aria-current="page" on the Projects entry when open from Sessions mode', () => {
    renderTopBar(makeOverlay("projects"), "/sessions");
    const button = screen.getByRole("button", { name: /projects/i });
    expect(button).toHaveAttribute("aria-current", "page");
  });
});

// ---------------------------------------------------------------------------
// Global Config trigger
// ---------------------------------------------------------------------------

describe("TopBar — Config overlay trigger", () => {
  it("renders the Config entry as a button in Task Manager mode", () => {
    renderTopBar(makeOverlay(), "/projects/proj-1/stories");
    expect(screen.getByRole("button", { name: "Go to Config" })).toBeInTheDocument();
  });

  it("renders the Config entry as a button in Sessions mode", () => {
    renderTopBar(makeOverlay(), "/sessions");
    expect(screen.getByRole("button", { name: "Go to Config" })).toBeInTheDocument();
  });

  it("clicking the Config entry calls overlay.openConfig()", () => {
    const overlay = makeOverlay();
    renderTopBar(overlay, "/sessions");
    fireEvent.click(screen.getByRole("button", { name: "Go to Config" }));
    expect(overlay.openConfig).toHaveBeenCalledTimes(1);
  });

  it('sets aria-current="page" on the Config entry when its overlay is open', () => {
    renderTopBar(makeOverlay("config"));
    const button = screen.getByRole("button", { name: "Go to Config" });
    expect(button).toHaveAttribute("aria-current", "page");
  });

  it("omits aria-current on the Config entry when the Projects overlay is open instead", () => {
    renderTopBar(makeOverlay("projects"));
    const button = screen.getByRole("button", { name: "Go to Config" });
    expect(button).not.toHaveAttribute("aria-current");
  });

  it("keeps both entries visible together in Task Manager and Sessions mode", () => {
    const { unmount } = renderTopBar(makeOverlay(), "/projects/proj-1/stories");
    expect(screen.getByRole("button", { name: /projects/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to Config" })).toBeInTheDocument();
    unmount();

    renderTopBar(makeOverlay(), "/sessions");
    expect(screen.getByRole("button", { name: /projects/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to Config" })).toBeInTheDocument();
  });

  // BUG-003 regression guard — position stability across a mode switch.
  it("holds the Projects and Config entries in the same relative order across a mode switch", () => {
    const { unmount } = renderTopBar(makeOverlay(), "/projects/proj-1/stories");
    const taskManagerButtons = screen
      .getAllByRole("button")
      .map((el) => el.getAttribute("aria-label") ?? el.textContent);
    unmount();

    renderTopBar(makeOverlay(), "/sessions");
    const sessionsButtons = screen
      .getAllByRole("button")
      .map((el) => el.getAttribute("aria-label") ?? el.textContent);

    expect(taskManagerButtons).toEqual(sessionsButtons);
  });
});
