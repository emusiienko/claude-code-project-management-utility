/**
 * Comment endpoint functions.
 *
 * Plain async wrappers around apiClient — one function per API operation.
 * TanStack Query hooks in src/features/comments/hooks/ consume these functions.
 *
 * Endpoints covered:
 *   POST   /v1/stories/:storyId/comments
 *   POST   /v1/tasks/:taskId/comments
 *   POST   /v1/milestones/:id/comments
 *   GET    /v1/{container}/:id/comments?page&limit&label_key&label_value&after_id&descendant_of
 *   GET    /v1/comments/:id
 *   GET    /v1/comments/:id/ancestors (bare Comment[], no envelope)
 *   PUT    /v1/comments/:id
 *   DELETE /v1/comments/:id
 */

import { apiClient } from "@/core/client";
import { API_PATHS } from "@/api/paths";
import type {
  Comment,
  ContainerType,
  CreateComment,
  Envelope,
  ListEnvelope,
  UpdateComment,
} from "@/api/types";

/** Filters supported by the comment list endpoint. */
export interface CommentFilters {
  label_key?: string;
  label_value?: string;
  /** Watermark id for incremental retrieval — returns only comments strictly after it. */
  after_id?: string;
  /** Comment id whose sub-thread (comments carrying it in `ancestors`) should be returned. */
  descendant_of?: string;
}

/** Resolves the container-scoped comments collection path for the given container type. */
function containerCommentsPath(
  containerType: ContainerType,
  containerId: string,
): string {
  switch (containerType) {
    case "story":
      return API_PATHS.STORY_COMMENTS(containerId);
    case "task":
      return API_PATHS.TASK_COMMENTS(containerId);
    case "milestone":
      return API_PATHS.MILESTONE_COMMENTS(containerId);
  }
}

/**
 * GET /v1/{container}/:id/comments — paginated, newest-first, optionally
 * filtered comment list.
 *
 * @param containerType - story | task | milestone.
 * @param containerId   - The owning container's ID.
 * @param filters       - Optional label_key / label_value / after_id / descendant_of filters.
 * @param page          - 1-based page number (defaults to 1).
 * @param limit         - Items per page.
 */
export async function listComments(
  containerType: ContainerType,
  containerId: string,
  filters?: CommentFilters,
  page = 1,
  limit = 50,
): Promise<ListEnvelope<Comment>> {
  return apiClient.get<ListEnvelope<Comment>>(
    containerCommentsPath(containerType, containerId),
    { page, limit, ...filters },
  );
}

/**
 * POST /v1/{container}/:id/comments — creates a comment on a story, task, or
 * milestone. `in_reply_to`, when present, derives the persisted `ancestors`
 * path server-side.
 */
export async function createComment(
  containerType: ContainerType,
  containerId: string,
  data: CreateComment,
): Promise<Comment> {
  const envelope = await apiClient.post<Envelope<Comment>>(
    containerCommentsPath(containerType, containerId),
    data,
  );
  return envelope.data;
}

/** GET /v1/comments/:id — fetches a single comment. */
export async function getComment(id: string): Promise<Comment> {
  const envelope = await apiClient.get<Envelope<Comment>>(API_PATHS.COMMENT(id));
  return envelope.data;
}

/**
 * GET /v1/comments/:id/ancestors — ordered (root-first) ancestor comment
 * bodies for a reply. Returns a bare array, not the standard envelope.
 */
export async function getCommentAncestors(id: string): Promise<Comment[]> {
  return apiClient.get<Comment[]>(API_PATHS.COMMENT_ANCESTORS(id));
}

/**
 * PUT /v1/comments/:id — updates content and/or labels. `author_role` and
 * `ancestors` are immutable and cannot be changed through this call.
 */
export async function updateComment(
  id: string,
  data: UpdateComment,
): Promise<Comment> {
  const envelope = await apiClient.put<Envelope<Comment>>(
    API_PATHS.COMMENT(id),
    data,
  );
  return envelope.data;
}

/** DELETE /v1/comments/:id — permanently deletes a comment. */
export async function deleteComment(id: string): Promise<void> {
  await apiClient.delete(API_PATHS.COMMENT(id));
}
