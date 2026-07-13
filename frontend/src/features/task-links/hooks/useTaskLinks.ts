/**
 * TanStack Query hooks for the Task Links feature.
 *
 * Provides a list query and create/delete mutations for task links.
 * On a successful create or delete, both the link list and the task rich-detail
 * cache are invalidated so the Task Detail Modal refreshes automatically.
 *
 * HTTP logic lives in src/api/endpoints/taskLinks.ts.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS, PAGINATION } from "@/config/apiConfig";
import {
  createTaskLink,
  deleteTaskLink,
  listTaskLinks,
  type TaskLinkFilters,
} from "@/api/endpoints/taskLinks";
import type { CreateTaskLink } from "@/api/types";

export type { TaskLinkFilters };

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Paginated, optionally filtered list of enriched task links for a given task.
 *
 * Each row carries a `direction` marker ("outbound" | "inbound") and a
 * linked-task summary (id, title, status).
 *
 * @param taskId  - Task whose links are shown.
 * @param filters - Optional direction and link_type filters.
 * @param page    - 1-based page number (defaults to 1).
 */
export function useTaskLinkList(
  taskId: string,
  filters?: TaskLinkFilters,
  page = 1,
) {
  return useQuery({
    queryKey: CACHE_KEYS.taskLinks.list(taskId, { ...filters, page }),
    queryFn: () => listTaskLinks(taskId, filters, page, PAGINATION.TASK_LINKS),
    staleTime: DATA_FRESHNESS.TASK_LINKS,
    enabled: Boolean(taskId),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Mutation: create a directed task link.
 *
 * Accepts an optional `sourceTaskId` to override the default source when
 * the user picks an inbound direction — in that case the other task is the
 * source and the current task is the target.
 *
 * On success: invalidates the link list and rich-detail cache for the current
 * task so the Task Detail Modal reflects the new link regardless of direction.
 *
 * @param taskId - The task being viewed — used for cache invalidation.
 */
export function useCreateTaskLink(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sourceTaskId,
      ...data
    }: CreateTaskLink & { sourceTaskId?: string }) =>
      createTaskLink(sourceTaskId ?? taskId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.taskLinks.list(taskId),
      });
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.tasks.richDetail(taskId),
      });
    },
  });
}

/**
 * Mutation: delete a task link by its own ID.
 *
 * On success: invalidates the link list for the owning task and the task's
 * rich-detail cache so both surfaces refresh.
 *
 * @param taskId - Owning task ID — required to scope cache invalidation.
 */
export function useDeleteTaskLink(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => deleteTaskLink(linkId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.taskLinks.list(taskId),
      });
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.tasks.richDetail(taskId),
      });
    },
  });
}
