/**
 * TanStack Query hooks for the Tasks feature.
 *
 * Provides list, detail, CRUD mutations with optimistic status updates,
 * and the story aggregate query. All mutations invalidate both the task
 * list and the story aggregate so the Kanban board and "N/M done" counter
 * stay in lockstep.
 *
 * HTTP logic lives in src/api/endpoints/tasks.ts.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS, PAGINATION } from "@/config/apiConfig";
import {
  createTask,
  deleteTask,
  getStoryAggregate,
  getTask,
  getTaskDetail,
  listTasks,
  updateTask,
  type TaskFilters,
} from "@/api/endpoints/tasks";
import type {
  CreateTask,
  ListEnvelope,
  Task,
  UpdateTask,
} from "@/api/types";

export type { TaskFilters };

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Paginated, filtered task list for a given story.
 *
 * The query key includes all filter params so each distinct filter combination
 * has its own cache entry.
 *
 * @param storyId - Owning story ID.
 * @param filters - Optional status / type / assignee_role / creator_role filters.
 * @param page    - 1-based page number (defaults to 1).
 */
export function useTaskList(
  storyId: string,
  filters?: TaskFilters,
  page = 1,
) {
  return useQuery({
    queryKey: CACHE_KEYS.tasks.list(storyId, { ...filters, page }),
    queryFn: () => listTasks(storyId, filters, page, PAGINATION.TASKS),
    staleTime: DATA_FRESHNESS.TASKS,
    enabled: Boolean(storyId),
  });
}

/**
 * Fetches a single task by ID.
 *
 * @param taskId - Task ID.
 */
export function useTask(taskId: string) {
  return useQuery({
    queryKey: CACHE_KEYS.tasks.detail(taskId),
    queryFn: () => getTask(taskId),
    staleTime: DATA_FRESHNESS.TASKS,
    enabled: Boolean(taskId),
  });
}

/**
 * Fetches a single task with its side-collections (links, attachments, comments).
 *
 * In STORY-005 these side-collections are always empty arrays;
 * they are populated by STORY-006/007/008.
 *
 * @param taskId - Task ID.
 */
export function useTaskDetail(taskId: string) {
  return useQuery({
    queryKey: CACHE_KEYS.tasks.richDetail(taskId),
    queryFn: () => getTaskDetail(taskId),
    staleTime: DATA_FRESHNESS.TASKS,
    enabled: Boolean(taskId),
  });
}

/**
 * Fetches the on-demand task-count aggregate for a story.
 *
 * Returns { story_id, total_tasks, by_status }. A story with no tasks
 * returns { total_tasks: 0, by_status: {} } — this is a success, not an error.
 *
 * @param storyId - Story ID.
 */
export function useStoryAggregate(storyId: string) {
  return useQuery({
    queryKey: CACHE_KEYS.stories.aggregate(storyId),
    queryFn: () => getStoryAggregate(storyId),
    staleTime: DATA_FRESHNESS.STORY_AGGREGATE,
    enabled: Boolean(storyId),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Mutation: create a task under a story.
 *
 * Invalidates the task list and story aggregate for the owning story on success.
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      storyId,
      data,
    }: {
      storyId: string;
      data: CreateTask;
    }) => createTask(storyId, data),
    onSuccess: (_created, { storyId }) => {
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.tasks.list(storyId),
      });
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.stories.aggregate(storyId),
      });
    },
  });
}

/**
 * Mutation: update a task with an optimistic status update.
 *
 * On `onMutate`: snapshots the current task list cache and immediately applies
 * the new status to the cache so the card moves to its new column without
 * waiting for the API response.
 *
 * On `onError`: rolls back to the snapshot.
 *
 * On `onSettled`: invalidates the task list and story aggregate so the board
 * reflects the authoritative server state.
 *
 * @param storyId - Owning story ID — required to scope cache invalidation.
 */
export function useUpdateTask(storyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string;
      data: UpdateTask;
    }) => updateTask(taskId, data),

    onMutate: async ({ taskId, data }) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({
        queryKey: CACHE_KEYS.tasks.list(storyId),
      });

      // Snapshot the current cache for rollback
      const previousData = queryClient.getQueryData<ListEnvelope<Task>>(
        CACHE_KEYS.tasks.list(storyId),
      );

      // Optimistically apply the update to the list cache
      queryClient.setQueryData<ListEnvelope<Task>>(
        CACHE_KEYS.tasks.list(storyId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((t) =>
              t.id === taskId ? { ...t, ...data } : t,
            ),
          };
        },
      );

      return { previousData };
    },

    onError: (_err, _vars, context) => {
      // Restore the snapshot on failure
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(
          CACHE_KEYS.tasks.list(storyId),
          context.previousData,
        );
      }
    },

    onSettled: (_data, _err, vars) => {
      // Always sync with the server after settle (success or error)
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.tasks.list(storyId),
      });
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.stories.aggregate(storyId),
      });
      // Invalidate the rich detail so the Task Detail modal shows fresh data
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.tasks.richDetail(vars.taskId),
      });
    },
  });
}

/**
 * Mutation: permanently delete a task.
 *
 * Invalidates the task list and story aggregate on success.
 *
 * @param storyId - Owning story ID — required to scope cache invalidation.
 */
export function useDeleteTask(storyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.tasks.list(storyId),
      });
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.stories.aggregate(storyId),
      });
    },
  });
}

