/**
 * RootRedirect — unit tests
 *
 * Covers:
 * - Redirects to /projects/:lastId/stories when a last-visited project ID
 *   exists in localStorage.
 * - Redirects to /projects when no project ID is stored and no projects exist.
 * - Redirects to /projects/:firstId/stories when no stored ID but projects exist.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { RootRedirect, LAST_PROJECT_KEY } from "./RootRedirect";

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

/** Render RootRedirect inside a MemoryRouter starting at "/" with a fresh QueryClient. */
function renderRootRedirect() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/projects"
            element={<div data-testid="projects-page">Projects</div>}
          />
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
  it("redirects to /projects when no last project ID is stored and no projects exist", async () => {
    renderRootRedirect();
    await waitFor(() =>
      expect(screen.getByTestId("projects-page")).toBeInTheDocument(),
    );
  });

  it("redirects to /projects/:lastId/stories when a last project ID is stored", () => {
    localStorage.setItem(LAST_PROJECT_KEY, JSON.stringify("proj-abc"));
    renderRootRedirect();
    // Immediate redirect — no fetch needed.
    expect(screen.getByTestId("stories-page")).toBeInTheDocument();
  });

  it("redirects to /projects when the stored value is null and no projects exist", async () => {
    localStorage.setItem(LAST_PROJECT_KEY, JSON.stringify(null));
    renderRootRedirect();
    await waitFor(() =>
      expect(screen.getByTestId("projects-page")).toBeInTheDocument(),
    );
  });

  it("redirects to /projects when the stored JSON is corrupted and no projects exist", async () => {
    localStorage.setItem(LAST_PROJECT_KEY, "not-valid-json{{");
    renderRootRedirect();
    await waitFor(() =>
      expect(screen.getByTestId("projects-page")).toBeInTheDocument(),
    );
  });

  it("redirects to /projects/:firstId/stories when no stored ID but projects exist", async () => {
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
