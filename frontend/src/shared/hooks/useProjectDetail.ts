/**
 * Cross-feature hook for fetching a single project by ID.
 *
 * Used by ProjectShell to validate that the project referenced in the URL
 * actually exists before rendering sub-nav content. Returns the project on
 * success or surfaces the loading/not-found/error states to the caller.
 *
 * HTTP logic lives in src/api/endpoints/projects.ts.
 */

import { useQuery } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS } from "@/config/apiConfig";
import { getProject } from "@/api/endpoints/projects";
import { ApiRequestError } from "@/core/client";

/** Return shape from useProjectDetail. */
export interface UseProjectDetailResult {
  /** The fetched project, or undefined while loading or when not found. */
  project: import("@/api/types").Project | undefined;
  /** True while the request is in-flight. */
  isLoading: boolean;
  /** True when the API returned 404 (project does not exist). */
  isNotFound: boolean;
  /** True for any non-404 error (network failure, server error, etc.). */
  isError: boolean;
}

/**
 * Fetches a single project by ID. Distinguishes 404 (not-found) from other
 * errors so callers can render different inline messages.
 */
export function useProjectDetail(projectId: string): UseProjectDetailResult {
  const query = useQuery({
    queryKey: CACHE_KEYS.projects.detail(projectId),
    queryFn: () => getProject(projectId),
    staleTime: DATA_FRESHNESS.PROJECTS,
    // Prevent TanStack Query from retrying 404s — the project simply does not exist.
    retry: (failureCount, error) => {
      if (error instanceof ApiRequestError && error.status === 404) return false;
      return failureCount < 3;
    },
  });

  const isNotFound =
    query.isError &&
    query.error instanceof ApiRequestError &&
    query.error.status === 404;

  const isError = query.isError && !isNotFound;

  return {
    project: query.data,
    isLoading: query.isLoading,
    isNotFound,
    isError,
  };
}
