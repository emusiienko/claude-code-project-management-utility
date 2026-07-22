/**
 * RootRedirect — unit tests
 *
 * Covers (STORY-022 Revision 3 — Projects has no route of its own any more;
 * a projectless cold start stays at "/" and auto-opens the Projects overlay
 * instead of redirecting to a "/projects" route):
 * - Redirects to /projects/:lastId/stories when a last-visited project ID
 *   exists in localStorage (unaffected by the overlay model).
 * - Stays at "/" and auto-opens the Projects overlay when no project ID is
 *   stored and no projects exist (cold start, empty install).
 * - Same for a null/corrupted stored value with no projects.
 * - Redirects to /projects/:firstId/stories when no stored ID but projects exist.
 * - The auto-open only fires once per mount (does not reopen on every
 *   background refetch of the still-empty project list).
 *
 * `RootRedirect` reads its overlay controls via `useOutletContext`, exactly
 * as it does when rendered under the real `RootLayout` — so it is rendered
 * here under a small stub layout that instantiates `useOverlayStack()` and
 * passes it down via `<Outlet context={overlay}>`, mirroring RootLayout.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { RootRedirect, LAST_PROJECT_KEY } from "./RootRedirect";
import { useOverlayStack } from "@/shared/hooks/useOverlayStack";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/api/endpoints/projects", () => ({
  getProjects: vi.fn(),
}));

import { getProjects } from "@/api/endpoints/projects";
const mockGetProjects = vi.mocked(getProjects);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Stub layout standing in for RootLayout: owns the overlay stack and shares
 * it with routed children via outlet context, exactly like the real shell.
 * Also surfaces the overlay's current `kind` in a data-testid so tests can
 * assert whether the Projects overlay auto-opened.
 */
function StubLayout() {
  const overlay = useOverlayStack();
  return (
    <div>
      <div data-testid="overlay-kind">{overlay.state.kind}</div>
      <Outlet context={overlay} />
    </div>
  );
}

/** Render RootRedirect inside a MemoryRouter starting at "/" with a fresh QueryClient. */
function renderRootRedirect() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<StubLayout />}>
            <Route index element={<RootRedirect />} />
          </Route>
          <Route
            path="/projects/:id/stories"
            element={<div data-testid="stories-page">Stories</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  // Default: no projects — most tests rely on this.
  mockGetProjects.mockResolvedValue([]);
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RootRedirect", () => {
  it("stays at \"/\" and auto-opens the Projects overlay when no last project ID is stored and no projects exist", async () => {
    renderRootRedirect();
    await waitFor(() =>
      expect(screen.getByTestId("overlay-kind")).toHaveTextContent("projects"),
    );
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
    expect(screen.queryByTestId("stories-page")).not.toBeInTheDocument();
  });

  it("redirects to /projects/:lastId/stories when a last project ID is stored", () => {
    localStorage.setItem(LAST_PROJECT_KEY, JSON.stringify("proj-abc"));
    renderRootRedirect();
    // Immediate redirect — no fetch needed.
    expect(screen.getByTestId("stories-page")).toBeInTheDocument();
  });

  it("stays at \"/\" and auto-opens the Projects overlay when the stored value is null and no projects exist", async () => {
    localStorage.setItem(LAST_PROJECT_KEY, JSON.stringify(null));
    renderRootRedirect();
    await waitFor(() =>
      expect(screen.getByTestId("overlay-kind")).toHaveTextContent("projects"),
    );
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("stays at \"/\" and auto-opens the Projects overlay when the stored JSON is corrupted and no projects exist", async () => {
    localStorage.setItem(LAST_PROJECT_KEY, "not-valid-json{{");
    renderRootRedirect();
    await waitFor(() =>
      expect(screen.getByTestId("overlay-kind")).toHaveTextContent("projects"),
    );
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("redirects to /projects/:firstId/stories when no stored ID but projects exist, and does not open the Projects overlay", async () => {
    mockGetProjects.mockResolvedValue([
      {
        id: "proj-first",
        name: "First Project",
        description: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ]);
    renderRootRedirect();
    await waitFor(() =>
      expect(screen.getByTestId("stories-page")).toBeInTheDocument(),
    );
  });
});
