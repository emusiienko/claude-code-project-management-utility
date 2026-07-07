/**
 * TanStack Query hooks for the Stories feature.
 *
 * List query (filtered + paginated) and CRUD mutations.
 * HTTP logic lives in src/api/endpoints/stories.ts.
 *
 * Status dropdown data source: useProjectSettingsEffective (reads story_statuses).
 * Project name for page heading: useProjectDetail (from projects hooks).
 * Both are re-exported here for convenience — do not duplicate their data fetching.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS, PAGINATION } from "@/config/apiConfig";
import {
  createStory,
  deleteStory,
  getStory,
  listStories,
  updateStory,
  type StoryFilters,
} from "@/api/endpoints/stories";
import type { CreateStory, UpdateStory } from "@/api/types";

export type { StoryFilters };

/**
 * Paginated, filtered story list for a given project.
 *
 * The query key includes all filter params so each distinct filter combination
 * has its own cache entry — switching filters does not show stale data.
 *
 * @param projectId - Owning project ID.
 * @param filters   - Optional status / label_key / label_value filters.
 * @param page      - 1-based page number (defaults to 1).
 */
export function useStories(
  projectId: string,
  filters?: StoryFilters,
  page = 1,
) {
  return useQuery({
    queryKey: CACHE_KEYS.stories.list(projectId, { ...filters, page }),
    queryFn: () => listStories(projectId, filters, page, PAGINATION.STORIES),
    staleTime: DATA_FRESHNESS.STORIES,
    enabled: Boolean(projectId),
  });
}

/**
 * Fetches a single story by ID.
 *
 * @param storyId - Story ID.
 */
export function useStory(storyId: string) {
  return useQuery({
    queryKey: CACHE_KEYS.stories.detail(storyId),
    queryFn: () => getStory(storyId),
    staleTime: DATA_FRESHNESS.STORIES,
    enabled: Boolean(storyId),
  });
}

/**
 * Mutation: create a story under a project.
 * Invalidates the full story list on success.
 */
export function useCreateStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateStory }) =>
      createStory(projectId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CACHE_KEYS.stories.all() });
    },
  });
}

/**
 * Mutation: update a story's title, content, status, or labels.
 * Providing `labels: []` clears all labels (valid per API contract).
 * Invalidates both the story list and the story detail on success.
 */
export function useUpdateStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storyId, data }: { storyId: string; data: UpdateStory }) =>
      updateStory(storyId, data),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: CACHE_KEYS.stories.all() });
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.stories.detail(updated.id),
      });
    },
  });
}

/**
 * Mutation: permanently delete a story and all its nested data.
 * Invalidates the story list on success.
 */
export function useDeleteStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (storyId: string) => deleteStory(storyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CACHE_KEYS.stories.all() });
    },
  });
}
