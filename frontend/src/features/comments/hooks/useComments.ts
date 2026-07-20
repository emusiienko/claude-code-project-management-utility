/**
 * TanStack Query hooks for the Comments feature.
 *
 * Provides a container-scoped list query, a single-comment query, an
 * ancestors (reply-lineage) query, and create/update/delete mutations.
 * Mutations invalidate the container's comment list AND the parent
 * container's rich-detail cache, so the section and any composed detail
 * (Story slide-over / Task Detail modal / Milestone Detail) stay in sync —
 * consistent with the attachments hook pattern.
 *
 * HTTP logic lives in src/api/endpoints/comments.ts.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS, PAGINATION } from "@/config/apiConfig";
import {
  createComment,
  deleteComment,
  getComment,
  getCommentAncestors,
  listComments,
  updateComment,
  type CommentFilters,
} from "@/api/endpoints/comments";
import type { ContainerType, CreateComment, UpdateComment } from "@/api/types";

export type { CommentFilters };

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Paginated, oldest-first, optionally filtered list of comments for a given container.
 *
 * @param containerType - story | task | milestone.
 * @param containerId   - The owning container's ID.
 * @param filters       - Optional label_key / label_value / after_id / descendant_of filters.
 * @param page          - 1-based page number (defaults to 1).
 */
export function useCommentList(
  containerType: ContainerType,
  containerId: string,
  filters?: CommentFilters,
  page = 1,
) {
  return useQuery({
    queryKey: CACHE_KEYS.comments.list(containerType, containerId, {
      ...filters,
      page,
    }),
    queryFn: () =>
      listComments(containerType, containerId, filters, page, PAGINATION.COMMENTS),
    staleTime: DATA_FRESHNESS.COMMENTS,
    enabled: Boolean(containerId),
  });
}

/**
 * Fetches a single comment by ID — used by the permalink resolver to locate
 * a comment's host container before navigating.
 */
export function useComment(commentId: string) {
  return useQuery({
    queryKey: CACHE_KEYS.comments.detail(commentId),
    queryFn: () => getComment(commentId),
    staleTime: DATA_FRESHNESS.COMMENTS,
    enabled: Boolean(commentId),
  });
}

/**
 * Fetches the ordered (root-first) ancestor lineage for a reply comment.
 * Disabled by default — only meaningful for comments with a non-empty `ancestors`.
 *
 * @param commentId - The comment whose ancestor chain is fetched.
 * @param enabled   - Only fetches when the caller has confirmed `ancestors` is non-empty.
 */
export function useCommentAncestors(commentId: string, enabled: boolean) {
  return useQuery({
    queryKey: CACHE_KEYS.comments.ancestors(commentId),
    queryFn: () => getCommentAncestors(commentId),
    staleTime: DATA_FRESHNESS.COMMENTS,
    enabled: enabled && Boolean(commentId),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Invalidates the container's comment list and its parent rich-detail cache. */
function invalidateContainer(
  queryClient: QueryClient,
  containerType: ContainerType,
  containerId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: CACHE_KEYS.comments.list(containerType, containerId),
  });
  switch (containerType) {
    case "story":
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.stories.richDetail(containerId),
      });
      break;
    case "task":
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.tasks.richDetail(containerId),
      });
      break;
    case "milestone":
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.milestones.richDetail(containerId),
      });
      break;
  }
}

/**
 * Mutation: create a comment on a container. `data.in_reply_to`, when set,
 * derives the persisted reply lineage server-side.
 *
 * @param containerType - story | task | milestone.
 * @param containerId   - The owning container's ID — used for cache invalidation.
 */
export function useCreateComment(containerType: ContainerType, containerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateComment) => createComment(containerType, containerId, data),
    onSuccess: () => invalidateContainer(queryClient, containerType, containerId),
  });
}

/**
 * Mutation: update a comment's content and/or labels. Providing `labels: []`
 * clears all labels. `author_role` and `ancestors` are immutable and silently
 * ignored by the server if sent.
 *
 * @param containerType - story | task | milestone — used for cache invalidation.
 * @param containerId   - The owning container's ID — used for cache invalidation.
 */
export function useUpdateComment(containerType: ContainerType, containerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: UpdateComment }) =>
      updateComment(commentId, data),
    onSuccess: (updated) => {
      invalidateContainer(queryClient, containerType, containerId);
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.comments.detail(updated.id),
      });
    },
  });
}

/**
 * Mutation: permanently delete a comment.
 *
 * @param containerType - story | task | milestone — used for cache invalidation.
 * @param containerId   - The owning container's ID — used for cache invalidation.
 */
export function useDeleteComment(containerType: ContainerType, containerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => invalidateContainer(queryClient, containerType, containerId),
  });
}
