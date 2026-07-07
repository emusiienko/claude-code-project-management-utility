/**
 * Unit tests for the Stories hooks — STORY-004 (TASK-007).
 *
 * Coverage:
 * - useStories: query key construction, enabled flag
 * - useCreateStory: success callback invalidates stories.all()
 * - useUpdateStory: success callback invalidates stories.all() AND stories.detail(id)
 * - useDeleteStory: success callback invalidates stories.all()
 *
 * Tests are purely behavioural — mock fetch / API layer, never React internals.
 * The QueryClient wrapper is provided by renderHook wrappers following the same
 * pattern as the rest of the frontend test suite.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useStories, useCreateStory, useUpdateStory, useDeleteStory } from "./useStories";
import { CACHE_KEYS } from "@/config/cacheConfig";

// ---------------------------------------------------------------------------
// Mock the entire stories endpoint module
// ---------------------------------------------------------------------------

vi.mock("@/api/endpoints/stories", () => ({
  listStories: vi.fn(),
  getStory: vi.fn(),
  createStory: vi.fn(),
  updateStory: vi.fn(),
  deleteStory: vi.fn(),
}));

import * as storiesApi from "@/api/endpoints/stories";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

const PROJECT_ID = "proj-abc-123";
const STORY_ID = "story-xyz-456";

// ---------------------------------------------------------------------------
// useStories — list query
// ---------------------------------------------------------------------------

describe("useStories", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
  });

  it("is disabled when projectId is empty", () => {
    vi.mocked(storiesApi.listStories).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });

    const { result } = renderHook(() => useStories(""), {
      wrapper: makeWrapper(queryClient),
    });

    // Disabled query: fetchStatus should be 'idle', not 'fetching'
    expect(result.current.fetchStatus).toBe("idle");
    expect(storiesApi.listStories).not.toHaveBeenCalled();
  });

  it("is enabled when projectId is non-empty", async () => {
    vi.mocked(storiesApi.listStories).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });

    const { result } = renderHook(() => useStories(PROJECT_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(storiesApi.listStories).toHaveBeenCalledTimes(1);
  });

  it("uses a cache key that includes the projectId", async () => {
    vi.mocked(storiesApi.listStories).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });

    renderHook(() => useStories(PROJECT_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() =>
      expect(queryClient.getQueryState(CACHE_KEYS.stories.list(PROJECT_ID, { page: 1 }))).toBeDefined()
    );
  });

  it("uses distinct cache entries for different projectIds", async () => {
    vi.mocked(storiesApi.listStories).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });

    const OTHER_PROJECT = "proj-other-999";
    renderHook(() => useStories(PROJECT_ID), { wrapper: makeWrapper(queryClient) });
    renderHook(() => useStories(OTHER_PROJECT), { wrapper: makeWrapper(queryClient) });

    await waitFor(() => expect(storiesApi.listStories).toHaveBeenCalledTimes(2));

    // Each call should have different project IDs
    const calls = vi.mocked(storiesApi.listStories).mock.calls;
    const calledProjectIds = calls.map((c) => c[0]);
    expect(calledProjectIds).toContain(PROJECT_ID);
    expect(calledProjectIds).toContain(OTHER_PROJECT);
  });

  it("passes filters to the API call", async () => {
    vi.mocked(storiesApi.listStories).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });

    const filters = { status: "planned" };
    renderHook(() => useStories(PROJECT_ID, filters), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(storiesApi.listStories).toHaveBeenCalled());
    expect(storiesApi.listStories).toHaveBeenCalledWith(PROJECT_ID, filters, 1, 50);
  });
});

// ---------------------------------------------------------------------------
// useCreateStory — mutation
// ---------------------------------------------------------------------------

describe("useCreateStory", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
  });

  it("calls createStory with projectId and data", async () => {
    const fakeStory = {
      id: STORY_ID, project_id: PROJECT_ID, title: "New Story",
      content: null, status: null, labels: [], milestone_id: null,
      created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    };
    vi.mocked(storiesApi.createStory).mockResolvedValue(fakeStory);

    const { result } = renderHook(() => useCreateStory(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({ projectId: PROJECT_ID, data: { title: "New Story" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(storiesApi.createStory).toHaveBeenCalledWith(PROJECT_ID, { title: "New Story" });
  });

  it("invalidates stories.all() cache on success", async () => {
    const fakeStory = {
      id: STORY_ID, project_id: PROJECT_ID, title: "Cache Invalidate Story",
      content: null, status: null, labels: [], milestone_id: null,
      created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    };
    vi.mocked(storiesApi.createStory).mockResolvedValue(fakeStory);

    // Seed a stale cache entry under stories.all so we can verify invalidation
    queryClient.setQueryData(CACHE_KEYS.stories.all(), []);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateStory(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({ projectId: PROJECT_ID, data: { title: "Cache Invalidate Story" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: CACHE_KEYS.stories.all() })
    );
  });
});

// ---------------------------------------------------------------------------
// useUpdateStory — mutation
// ---------------------------------------------------------------------------

describe("useUpdateStory", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
  });

  it("calls updateStory with storyId and data", async () => {
    const updatedStory = {
      id: STORY_ID, project_id: PROJECT_ID, title: "Updated Title",
      content: null, status: null, labels: [], milestone_id: null,
      created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    };
    vi.mocked(storiesApi.updateStory).mockResolvedValue(updatedStory);

    const { result } = renderHook(() => useUpdateStory(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({ storyId: STORY_ID, data: { title: "Updated Title" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(storiesApi.updateStory).toHaveBeenCalledWith(STORY_ID, { title: "Updated Title" });
  });

  it("invalidates stories.all() cache on success", async () => {
    const updatedStory = {
      id: STORY_ID, project_id: PROJECT_ID, title: "All Invalidate Story",
      content: null, status: null, labels: [], milestone_id: null,
      created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    };
    vi.mocked(storiesApi.updateStory).mockResolvedValue(updatedStory);
    queryClient.setQueryData(CACHE_KEYS.stories.all(), []);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateStory(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({ storyId: STORY_ID, data: { title: "All Invalidate Story" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: CACHE_KEYS.stories.all() })
    );
  });

  it("also invalidates the story detail cache on success", async () => {
    const updatedStory = {
      id: STORY_ID, project_id: PROJECT_ID, title: "Detail Invalidate Story",
      content: null, status: null, labels: [], milestone_id: null,
      created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    };
    vi.mocked(storiesApi.updateStory).mockResolvedValue(updatedStory);
    queryClient.setQueryData(CACHE_KEYS.stories.detail(STORY_ID), updatedStory);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateStory(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({ storyId: STORY_ID, data: { title: "Detail Invalidate Story" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: CACHE_KEYS.stories.detail(STORY_ID) })
    );
  });
});

// ---------------------------------------------------------------------------
// useDeleteStory — mutation
// ---------------------------------------------------------------------------

describe("useDeleteStory", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
  });

  it("calls deleteStory with the story id", async () => {
    vi.mocked(storiesApi.deleteStory).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteStory(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate(STORY_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(storiesApi.deleteStory).toHaveBeenCalledWith(STORY_ID);
  });

  it("invalidates stories.all() cache on success", async () => {
    vi.mocked(storiesApi.deleteStory).mockResolvedValue(undefined);
    queryClient.setQueryData(CACHE_KEYS.stories.all(), []);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteStory(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate(STORY_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: CACHE_KEYS.stories.all() })
    );
  });
});
