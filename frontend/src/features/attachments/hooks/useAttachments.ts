/**
 * TanStack Query hooks for the Attachments feature.
 *
 * Provides a container-scoped list query and create/delete mutations (no
 * update, no archive — attachments are immutable, per api-contract v1.5).
 * Mutations invalidate the container's attachment list AND the parent
 * container's rich-detail cache, so the section and any composed detail
 * (Story slide-over / Task Detail modal / Milestone Detail) stay in sync.
 *
 * HTTP logic lives in src/api/endpoints/attachments.ts.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS, PAGINATION } from "@/config/apiConfig";
import {
  createDocumentAttachment,
  createExternalRefAttachment,
  createStoredFileAttachment,
  deleteAttachment,
  getAttachment,
  getAttachmentFileText,
  listAttachments,
  type AttachmentFilters,
} from "@/api/endpoints/attachments";
import type {
  ContainerType,
  CreateDocumentAttachment,
  CreateExternalRefAttachment,
  CreateStoredFileAttachment,
} from "@/api/types";

export type { AttachmentFilters };

/** Discriminated input accepted by `useCreateAttachment` — one variant per creation path. */
export type CreateAttachmentInput =
  | { method: "document-text"; data: CreateDocumentAttachment }
  | { method: "external-ref"; data: CreateExternalRefAttachment }
  | { method: "stored-file"; data: CreateStoredFileAttachment };

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Paginated, optionally filtered list of attachments for a given container.
 *
 * @param containerType - story | task | milestone.
 * @param containerId   - The owning container's ID.
 * @param filters       - Optional `kind` filter.
 * @param page          - 1-based page number (defaults to 1).
 */
export function useAttachmentList(
  containerType: ContainerType,
  containerId: string,
  filters?: AttachmentFilters,
  page = 1,
) {
  return useQuery({
    queryKey: CACHE_KEYS.attachments.list(containerType, containerId, {
      ...filters,
      page,
    }),
    queryFn: () =>
      listAttachments(
        containerType,
        containerId,
        filters,
        page,
        PAGINATION.ATTACHMENTS,
      ),
    staleTime: DATA_FRESHNESS.ATTACHMENTS,
    enabled: Boolean(containerId),
  });
}

/**
 * Fetches a single attachment's metadata by ID.
 *
 * Not currently consumed by any component (rows already have the full
 * `Attachment` from the list query) — exposed for completeness and for any
 * future deep-linked attachment view.
 */
export function useAttachment(attachmentId: string) {
  return useQuery({
    queryKey: CACHE_KEYS.attachments.detail(attachmentId),
    queryFn: () => getAttachment(attachmentId),
    staleTime: DATA_FRESHNESS.ATTACHMENTS,
    enabled: Boolean(attachmentId),
  });
}

/**
 * Fetches a stored file's raw text content for the in-app viewer
 * (markdown / plain text / CSV / JSON). Disabled until the viewer opens.
 *
 * @param attachmentId - The attachment whose file content is fetched.
 * @param enabled      - Only fetches while the viewer is open for a text-renderable attachment.
 */
export function useAttachmentFileText(attachmentId: string, enabled: boolean) {
  return useQuery({
    queryKey: CACHE_KEYS.attachments.file(attachmentId),
    queryFn: () => getAttachmentFileText(attachmentId),
    enabled: enabled && Boolean(attachmentId),
    staleTime: DATA_FRESHNESS.ATTACHMENTS,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Invalidates the container's attachment list and its parent rich-detail cache. */
function invalidateContainer(
  queryClient: QueryClient,
  containerType: ContainerType,
  containerId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: CACHE_KEYS.attachments.list(containerType, containerId),
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
 * Mutation: create an attachment of any kind on a container.
 *
 * Dispatches to the matching endpoint function based on `method` — the three
 * creation paths (document-as-text, external-ref, and multipart stored-file
 * upload for document-as-file/image/file) converge on one mutation so the
 * Attachments section has a single create entry point.
 *
 * @param containerType - story | task | milestone.
 * @param containerId   - The owning container's ID — used for cache invalidation.
 */
export function useCreateAttachment(
  containerType: ContainerType,
  containerId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAttachmentInput) => {
      switch (input.method) {
        case "document-text":
          return createDocumentAttachment(containerType, containerId, input.data);
        case "external-ref":
          return createExternalRefAttachment(containerType, containerId, input.data);
        case "stored-file":
          return createStoredFileAttachment(containerType, containerId, input.data);
      }
    },
    onSuccess: () => invalidateContainer(queryClient, containerType, containerId),
  });
}

/**
 * Mutation: permanently delete an attachment (any kind).
 *
 * @param containerType - story | task | milestone — used for cache invalidation.
 * @param containerId   - The owning container's ID — used for cache invalidation.
 */
export function useDeleteAttachment(
  containerType: ContainerType,
  containerId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment(attachmentId),
    onSuccess: () => invalidateContainer(queryClient, containerType, containerId),
  });
}
