/**
 * Cross-feature hook for the project list.
 * Used wherever a project selector is needed (Settings, future screens).
 * HTTP logic lives in src/api/endpoints/projects.ts.
 */

import { useQuery } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS, PAGINATION } from "@/config/apiConfig";
import { getProjects } from "@/api/endpoints/projects";

/** Fetches the full project list (up to the API maximum of 100). */
export function useProjectList() {
  return useQuery({
    queryKey: CACHE_KEYS.projects.list(),
    queryFn: () => getProjects(PAGINATION.PROJECTS),
    staleTime: DATA_FRESHNESS.PROJECTS,
  });
}