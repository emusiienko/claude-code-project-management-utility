/**
 * Task links endpoint functions.
 *
 * Plain async wrappers around apiClient — one function per API operation.
 * TanStack Query hooks in src/features/task-links/hooks/ consume these functions.
 *
 * Endpoints covered (STORY-006, pending contract ratification at Reconcile):
 *   POST   /v1/tasks/:taskId/links
 *   GET    /v1/tasks/:taskId/links?page&limit&direction&link_type
 *   DELETE /v1/task-links/:id
 */

import { apiClient } from "@/core/client";
import { API_PATHS } from "@/api/paths";
import type {
  CreateTaskLink,
  Envelope,
  EnrichedTaskLink,
  ListEnvelope,
  TaskLink,
} from "@/api/types";

/** Filters supported by the task-link list endpoint. */
export interface TaskLinkFilters {
  direction?: "outbound" | "inbound" | "both";
  link_type?: string;
}

/**
 * POST /v1/tasks/:taskId/links — creates a directed task link and returns the created resource.
 *
 * @param taskId - Source task ID.
 * @param data   - Target task ID and link type.
 */
export async function createTaskLink(
  taskId: string,
  data: CreateTaskLink,
): Promise<TaskLink> {
  const envelope = await apiClient.post<Envelope<TaskLink>>(
    API_PATHS.TASK_LINKS(taskId),
    data,
  );
  return envelope.data;
}

/**
 * GET /v1/tasks/:taskId/links — returns a paginated list of enriched task links.
 *
 * Returns the full ListEnvelope so callers have access to pagination metadata.
 * Each row carries a `direction` marker and a linked-task summary.
 *
 * @param taskId  - Task ID whose links are queried.
 * @param filters - Optional direction and link_type filters.
 * @param page    - 1-based page number (defaults to 1).
 * @param limit   - Items per page.
 */
export async function listTaskLinks(
  taskId: string,
  filters?: TaskLinkFilters,
  page = 1,
  limit = 100,
): Promise<ListEnvelope<EnrichedTaskLink>> {
  return apiClient.get<ListEnvelope<EnrichedTaskLink>>(
    API_PATHS.TASK_LINKS(taskId),
    { page, limit, ...filters },
  );
}

/**
 * DELETE /v1/task-links/:id — permanently deletes a task link by its own ID.
 *
 * @param linkId - Task link ID (not the task ID).
 */
export async function deleteTaskLink(linkId: string): Promise<void> {
  await apiClient.delete(API_PATHS.TASK_LINK(linkId));
}
