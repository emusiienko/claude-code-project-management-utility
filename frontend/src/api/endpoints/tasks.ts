/**
 * Tasks endpoint functions.
 *
 * Plain async wrappers around apiClient — one function per API operation.
 * Each function unwraps the response envelope and returns the domain type directly.
 * TanStack Query hooks in src/features/tasks/hooks/ consume these functions.
 *
 * Endpoints covered (docs/api-contract.md v1.0):
 *   POST   /v1/stories/:storyId/tasks
 *   GET    /v1/stories/:storyId/tasks?page&limit&status&type&assignee_role&creator_role
 *   GET    /v1/tasks/:id
 *   PUT    /v1/tasks/:id
 *   DELETE /v1/tasks/:id
 *   GET    /v1/tasks/:id/detail
 *
 * Story aggregate endpoint (per api-contract.md — scoped to the Stories domain):
 *   GET    /v1/stories/:id/aggregate
 */

import { apiClient } from "@/core/client";
import { API_PATHS } from "@/api/paths";
import type {
  CreateTask,
  Envelope,
  ListEnvelope,
  StoryAggregate,
  Task,
  TaskDetail,
  UpdateTask,
} from "@/api/types";

/** Filters supported by the task list endpoint. */
export interface TaskFilters {
  status?: string;
  type?: string;
  assignee_role?: string;
  creator_role?: string;
}

/**
 * POST /v1/stories/:storyId/tasks — creates a task and returns the created resource.
 *
 * @param storyId - Owning story ID.
 * @param data    - Task creation payload.
 */
export async function createTask(
  storyId: string,
  data: CreateTask,
): Promise<Task> {
  const envelope = await apiClient.post<Envelope<Task>>(
    API_PATHS.STORY_TASKS(storyId),
    data,
  );
  return envelope.data;
}

/**
 * GET /v1/stories/:storyId/tasks — returns a paginated, optionally filtered task list.
 *
 * Returns the full ListEnvelope so callers have access to pagination metadata.
 *
 * @param storyId - Owning story ID.
 * @param filters - Optional status / type / assignee_role / creator_role filters.
 * @param page    - 1-based page number (defaults to 1).
 * @param limit   - Items per page.
 */
export async function listTasks(
  storyId: string,
  filters?: TaskFilters,
  page = 1,
  limit = 100,
): Promise<ListEnvelope<Task>> {
  return apiClient.get<ListEnvelope<Task>>(API_PATHS.STORY_TASKS(storyId), {
    page,
    limit,
    ...filters,
  });
}

/**
 * GET /v1/tasks/:id — returns a single task by its ID.
 *
 * @param taskId - Task ID.
 */
export async function getTask(taskId: string): Promise<Task> {
  const envelope = await apiClient.get<Envelope<Task>>(
    API_PATHS.TASK(taskId),
  );
  return envelope.data;
}

/**
 * GET /v1/tasks/:id/detail — returns a task with its side-collections.
 *
 * In STORY-005 the links, attachments, and comments arrays are always empty.
 * They are populated by STORY-006/007/008 respectively.
 *
 * @param taskId - Task ID.
 */
export async function getTaskDetail(taskId: string): Promise<TaskDetail> {
  const envelope = await apiClient.get<Envelope<TaskDetail>>(
    API_PATHS.TASK_DETAIL(taskId),
  );
  return envelope.data;
}

/**
 * PUT /v1/tasks/:id — updates a task and returns the updated resource.
 *
 * `story_id` is immutable; all other Task fields may be updated.
 * Providing `labels: []` clears all labels.
 *
 * @param taskId - Task ID.
 * @param data   - Fields to update.
 */
export async function updateTask(
  taskId: string,
  data: UpdateTask,
): Promise<Task> {
  const envelope = await apiClient.put<Envelope<Task>>(
    API_PATHS.TASK(taskId),
    data,
  );
  return envelope.data;
}

/**
 * DELETE /v1/tasks/:id — permanently deletes the task.
 *
 * @param taskId - Task ID.
 */
export async function deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(API_PATHS.TASK(taskId));
}

// ---------------------------------------------------------------------------
// Story aggregate
// ---------------------------------------------------------------------------

/**
 * GET /v1/stories/:id/aggregate — returns the on-demand task-count aggregate for a story.
 *
 * Returns { story_id, total_tasks, by_status }. A story with no tasks returns
 * { total_tasks: 0, by_status: {} } — this is not an error.
 *
 * @param storyId - Story ID.
 */
export async function getStoryAggregate(
  storyId: string,
): Promise<StoryAggregate> {
  const envelope = await apiClient.get<Envelope<StoryAggregate>>(
    API_PATHS.STORY_AGGREGATE(storyId),
  );
  return envelope.data;
}
