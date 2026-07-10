/**
 * useActiveMilestone — finds the single active milestone for a project, if any.
 *
 * Fetches the project's milestone list and returns the milestone whose status is "active".
 * Used by the Board view to default-filter stories to the active milestone's stories.
 *
 * @param projectId - Owning project ID.
 * @returns TanStack Query result; `data` is the active Milestone or null when none is active.
 */

import { useQuery } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS, PAGINATION } from "@/config/apiConfig";
import { listMilestones } from "@/api/endpoints/milestones";
import type { Milestone } from "@/api/types";

export function useActiveMilestone(projectId: string) {
  return useQuery<Milestone | null>({
    queryKey: CACHE_KEYS.milestones.list({ project_id: projectId, active: true }),
    queryFn: async () => {
      const envelope = await listMilestones(
        { project_id: projectId },
        1,
        PAGINATION.MILESTONES,
      );
      return envelope.data.find((m) => m.status === "active") ?? null;
    },
    staleTime: DATA_FRESHNESS.MILESTONES,
    enabled: Boolean(projectId),
  });
}
