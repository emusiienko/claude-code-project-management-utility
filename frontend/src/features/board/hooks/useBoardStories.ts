/**
 * useBoardStories — fetches all stories for the board view.
 *
 * Uses the API maximum page size (PAGINATION.BOARD_STORIES = 100) to load all
 * project stories in a single request. The board kanban does not paginate —
 * a future story (STORY-012+) will add virtualization if needed.
 */

import { useQuery } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS, PAGINATION } from "@/config/apiConfig";
import { listStories } from "@/api/endpoints/stories";

/**
 * Query hook for the board: fetches all stories for a project without filters.
 *
 * @param projectId - Owning project ID.
 */
export function useBoardStories(projectId: string) {
  return useQuery({
    queryKey: CACHE_KEYS.stories.list(projectId, { board: true }),
    queryFn: () => listStories(projectId, undefined, 1, PAGINATION.BOARD_STORIES),
    staleTime: DATA_FRESHNESS.STORIES,
    enabled: Boolean(projectId),
  });
}
