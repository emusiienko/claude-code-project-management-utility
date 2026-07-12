/**
 * Unit tests for the Tasks hooks — STORY-005 (TASK-007 reconcile).
 *
 * Coverage:
 * - useTaskList: disabled when storyId is empty, enabled when storyId present,
 *   passes filters, uses story-scoped cache key
 * - useCreateTask: calls createTask, invalidates task list AND story aggregate
 * - useUpdateTask: calls updateTask, applies optimistic update, rolls back on error,
 *   invalidates task list AND story aggregate AND rich-detail on settle
 * - useDeleteTask: calls deleteTask, invalidates task list AND story aggregate
 *
 * Pattern mirrors useStories.test.ts — mock fetch layer, use renderHook with
 * a real QueryClient wrapper, never mock React internals.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import {
  useTaskList,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "./useTasks";
import { CACHE_KEYS } from "@/config/cacheConfig";
import type { ListEnvelope, Task } from "@/api/types";

// ---------------------------------------------------------------------------
// Mock the tasks endpoint module
// ---------------------------------------------------------------------------

vi.mock("@/api/endpoints/tasks", () => ({
  listTasks: vi.fn(),
  getTask: vi.fn(),
  getTaskDetail: vi.fn(),
  getStoryAggregate: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

import * as tasksApi from "@/api/endpoints/tasks";

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

const STORY_ID = "story-abc-123";
const TASK_ID = "task-xyz-456";
const OTHER_STORY_ID = "story-other-999";

const EMPTY_LIST: ListEnvelope<Task> = {
  data: [],
  meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
};

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: TASK_ID,
    story_id: STORY_ID,
    title: "Test Task",
    content: null,
    type: "task",
    status: "todo",
    assignee_role: null,
    creator_role: null,
    labels: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// useTaskList
// ---------------------------------------------------------------------------

describe("useTaskList", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
  });

  it("is disabled when storyId is empty", () => {
    vi.mocked(tasksApi.listTasks).mockResolvedValue(EMPTY_LIST);

    const { result } = renderHook(() => useTaskList(""), {
      wrapper: makeWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(tasksApi.listTasks).not.toHaveBeenCalled();
  });

  it("is enabled when storyId is non-empty", async () => {
    vi.mocked(tasksApi.listTasks).mockResolvedValue(EMPTY_LIST);

    const { result } = renderHook(() => useTaskList(STORY_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(tasksApi.listTasks).toHaveBeenCalledTimes(1);
  });

  it("uses a cache key scoped to the storyId", async () => {
    vi.mocked(tasksApi.listTasks).mockResolvedValue(EMPTY_LIST);

    renderHook(() => useTaskList(STORY_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() =>
      expect(
        queryClient.getQueryState(CACHE_KEYS.tasks.list(STORY_ID, { page: 1 })),
      ).toBeDefined(),
    );
  });

  it("uses distinct cache entries for different storyIds", async () => {
    vi.mocked(tasksApi.listTasks).mockResolvedValue(EMPTY_LIST);

    renderHook(() => useTaskList(STORY_ID), { wrapper: makeWrapper(queryClient) });
    renderHook(() => useTaskList(OTHER_STORY_ID), { wrapper: makeWrapper(queryClient) });

    await waitFor(() => expect(tasksApi.listTasks).toHaveBeenCalledTimes(2));

    const calledStoryIds = vi.mocked(tasksApi.listTasks).mock.calls.map((c) => c[0]);
    expect(calledStoryIds).toContain(STORY_ID);
    expect(calledStoryIds).toContain(OTHER_STORY_ID);
  });

  it("passes filters to the API call", async () => {
    vi.mocked(tasksApi.listTasks).mockResolvedValue(EMPTY_LIST);

    const filters = { status: "todo", type: "bug" };
    renderHook(() => useTaskList(STORY_ID, filters), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(tasksApi.listTasks).toHaveBeenCalled());
    expect(tasksApi.listTasks).toHaveBeenCalledWith(
      STORY_ID,
      filters,
      1,
      expect.any(Number),
    );
  });
});

// ---------------------------------------------------------------------------
// useCreateTask
// ---------------------------------------------------------------------------

describe("useCreateTask", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
  });

  it("calls createTask with storyId and data", async () => {
    const task = makeTask();
    vi.mocked(tasksApi.createTask).mockResolvedValue(task);

    const { result } = renderHook(() => useCreateTask(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({
      storyId: STORY_ID,
      data: { title: "New Task", type: "task", status: "todo" },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(tasksApi.createTask).toHaveBeenCalledWith(STORY_ID, {
      title: "New Task",
      type: "task",
      status: "todo",
    });
  });

  it("invalidates task list for the owning story on success", async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue(makeTask());

    queryClient.setQueryData(CACHE_KEYS.tasks.list(STORY_ID), EMPTY_LIST);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateTask(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({
      storyId: STORY_ID,
      data: { title: "Invalidate List Task", type: "task", status: "todo" },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: CACHE_KEYS.tasks.list(STORY_ID) }),
    );
  });

  it("invalidates story aggregate for the owning story on success", async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue(makeTask());

    queryClient.setQueryData(CACHE_KEYS.stories.aggregate(STORY_ID), {
      story_id: STORY_ID,
      total_tasks: 0,
      by_status: {},
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateTask(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({
      storyId: STORY_ID,
      data: { title: "Invalidate Aggregate Task", type: "task", status: "todo" },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: CACHE_KEYS.stories.aggregate(STORY_ID),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// useUpdateTask
// ---------------------------------------------------------------------------

describe("useUpdateTask", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
  });

  it("calls updateTask with taskId and data", async () => {
    const updatedTask = makeTask({ title: "Updated Title" });
    vi.mocked(tasksApi.updateTask).mockResolvedValue(updatedTask);

    const { result } = renderHook(() => useUpdateTask(STORY_ID), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({ taskId: TASK_ID, data: { title: "Updated Title" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(tasksApi.updateTask).toHaveBeenCalledWith(TASK_ID, {
      title: "Updated Title",
    });
  });

  it("applies optimistic update to task list cache on mutate", async () => {
    // Seed the cache with one task at status "todo"
    const originalTask = makeTask({ status: "todo" });
    const seedList: ListEnvelope<Task> = {
      data: [originalTask],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    };
    queryClient.setQueryData(CACHE_KEYS.tasks.list(STORY_ID, {}), seedList);

    // Make the API call slow so we can observe the optimistic state
    vi.mocked(tasksApi.updateTask).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(makeTask({ status: "done" })), 500)),
    );

    const { result } = renderHook(() => useUpdateTask(STORY_ID), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({ taskId: TASK_ID, data: { status: "done" } });

    // After onMutate fires, the cache should already reflect the new status
    await waitFor(() => {
      const cached = queryClient.getQueryData<ListEnvelope<Task>>(
        CACHE_KEYS.tasks.list(STORY_ID, {}),
      );
      return cached?.data[0]?.status === "done";
    });
  });

  it("rolls back optimistic update on API error", async () => {
    const originalTask = makeTask({ status: "todo" });
    const seedList: ListEnvelope<Task> = {
      data: [originalTask],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    };
    queryClient.setQueryData(CACHE_KEYS.tasks.list(STORY_ID, {}), seedList);

    vi.mocked(tasksApi.updateTask).mockRejectedValue(new Error("API failure"));

    const { result } = renderHook(() => useUpdateTask(STORY_ID), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({ taskId: TASK_ID, data: { status: "done" } });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should be rolled back to the original status
    const cached = queryClient.getQueryData<ListEnvelope<Task>>(
      CACHE_KEYS.tasks.list(STORY_ID, {}),
    );
    expect(cached?.data[0]?.status).toBe("todo");
  });

  it("invalidates task list and story aggregate on settle", async () => {
    vi.mocked(tasksApi.updateTask).mockResolvedValue(makeTask({ title: "Settled" }));

    queryClient.setQueryData(CACHE_KEYS.tasks.list(STORY_ID), EMPTY_LIST);
    queryClient.setQueryData(CACHE_KEYS.stories.aggregate(STORY_ID), {
      story_id: STORY_ID,
      total_tasks: 1,
      by_status: { todo: 1 },
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateTask(STORY_ID), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({ taskId: TASK_ID, data: { title: "Settled" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: CACHE_KEYS.tasks.list(STORY_ID) }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: CACHE_KEYS.stories.aggregate(STORY_ID),
      }),
    );
  });

  it("invalidates rich-detail on settle so Task Detail modal shows fresh data", async () => {
    vi.mocked(tasksApi.updateTask).mockResolvedValue(makeTask({ title: "Rich Detail Fresh" }));

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateTask(STORY_ID), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({ taskId: TASK_ID, data: { title: "Rich Detail Fresh" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: CACHE_KEYS.tasks.richDetail(TASK_ID),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// useDeleteTask
// ---------------------------------------------------------------------------

describe("useDeleteTask", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
  });

  it("calls deleteTask with the task id", async () => {
    vi.mocked(tasksApi.deleteTask).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteTask(STORY_ID), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate(TASK_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(tasksApi.deleteTask).toHaveBeenCalledWith(TASK_ID);
  });

  it("invalidates task list on success", async () => {
    vi.mocked(tasksApi.deleteTask).mockResolvedValue(undefined);
    queryClient.setQueryData(CACHE_KEYS.tasks.list(STORY_ID), EMPTY_LIST);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteTask(STORY_ID), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate(TASK_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: CACHE_KEYS.tasks.list(STORY_ID) }),
    );
  });

  it("invalidates story aggregate on success", async () => {
    vi.mocked(tasksApi.deleteTask).mockResolvedValue(undefined);
    queryClient.setQueryData(CACHE_KEYS.stories.aggregate(STORY_ID), {
      story_id: STORY_ID,
      total_tasks: 1,
      by_status: { todo: 1 },
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteTask(STORY_ID), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate(TASK_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: CACHE_KEYS.stories.aggregate(STORY_ID),
      }),
    );
  });
});
