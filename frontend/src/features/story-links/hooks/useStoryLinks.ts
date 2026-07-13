/**
 * TanStack Query hooks for the Story Links feature.
 *
 * Provides a list query and create/delete mutations for story links.
 * On a successful create or delete, both the link list and the story rich-detail
 * cache are invalidated so the Story Slide-over refreshes automatically.
 *
 * HTTP logic lives in src/api/endpoints/storyLinks.ts.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS, PAGINATION } from "@/config/apiConfig";
import {
  createStoryLink,
  deleteStoryLink,
  listStoryLinks,
  type StoryLinkFilters,
} from "@/api/endpoints/storyLinks";
import type { CreateStoryLink } from "@/api/types";

export type { StoryLinkFilters };

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Paginated, optionally filtered list of enriched story links for a given story.
 *
 * Each row carries a `direction` marker ("outbound" | "inbound") and a
 * linked-story summary (id, title, status).
 *
 * @param storyId - Story whose links are shown.
 * @param filters - Optional direction and link_type filters.
 * @param page    - 1-based page number (defaults to 1).
 */
export function useStoryLinkList(
  storyId: string,
  filters?: StoryLinkFilters,
  page = 1,
) {
  return useQuery({
    queryKey: CACHE_KEYS.storyLinks.list(storyId, { ...filters, page }),
    queryFn: () =>
      listStoryLinks(storyId, filters, page, PAGINATION.STORY_LINKS),
    staleTime: DATA_FRESHNESS.STORY_LINKS,
    enabled: Boolean(storyId),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Mutation: create a directed story link.
 *
 * Accepts an optional `sourceStoryId` to override the default source when
 * the user picks an inbound direction — in that case the other story is the
 * source and the current story is the target.
 *
 * On success: invalidates the link list and rich-detail cache for the current
 * story so the Story Slide-over reflects the new link regardless of direction.
 *
 * @param storyId - The story being viewed — used for cache invalidation.
 */
export function useCreateStoryLink(storyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sourceStoryId,
      ...data
    }: CreateStoryLink & { sourceStoryId?: string }) =>
      createStoryLink(sourceStoryId ?? storyId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.storyLinks.list(storyId),
      });
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.stories.richDetail(storyId),
      });
    },
  });
}

/**
 * Mutation: delete a story link by its own ID.
 *
 * On success: invalidates the link list for the owning story and the story's
 * rich-detail cache so both surfaces refresh.
 *
 * @param storyId - Owning story ID — required to scope cache invalidation.
 */
export function useDeleteStoryLink(storyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => deleteStoryLink(linkId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.storyLinks.list(storyId),
      });
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.stories.richDetail(storyId),
      });
    },
  });
}
