/**
 * useBoardStories — fetches stories for the board view.
 *
 * Uses the API maximum page size (PAGINATION.BOARD_STORIES = 100) to load all
 * relevant stories in a single request. The board kanban does not paginate.
 *
 * When `milestoneId` is provided, fetches only stories assigned to that milestone
 * (active-milestone filter introduced in STORY-012, TASK-005). Without `milestoneId`,
 * all project stories are fetched unfiltered.
 *
 * @param projectId   - Owning project ID.
 * @param milestoneId - Optional milestone ID to filter stories by.
 */

import { useQuery } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS, PAGINATION } from "@/config/apiConfig";
import { listStories } from "@/api/endpoints/stories";

export function useBoardStories(projectId: string, milestoneId?: string | null) {
  const filters = milestoneId ? { milestone_id: milestoneId } : undefined;
  return useQuery({
    queryKey: CACHE_KEYS.stories.list(projectId, {
      board: true,
      milestone_id: milestoneId ?? null,
    }),
    queryFn: () =>
      listStories(projectId, filters, 1, PAGINATION.BOARD_STORIES),
    staleTime: DATA_FRESHNESS.STORIES,
    enabled: Boolean(projectId),
  });
}
