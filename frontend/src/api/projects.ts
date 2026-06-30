/**
 * TanStack Query hooks for the Projects domain.
 *
 * Consumes the locked v1.0 API contract (GET /v1/projects, and per-project endpoints).
 * Full CRUD mutations are implemented in STORY-003 (Project Management screen).
 * This file currently exposes only the list hook needed by the Settings screen.
 *
 * TODO(STORY-003): add create, update, delete mutations when the Projects screen is built.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { queryKeys } from "@/api/queryKeys";
import type { ListEnvelope, Project } from "@/api/types";

/**
 * Fetches the full list of projects (up to 100, the API maximum).
 * Used by the Project Settings screen to populate the project selector.
 */
export function useProjectList() {
  return useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: async () => {
      const envelope = await apiClient.get<ListEnvelope<Project>>(
        "/v1/projects",
        { limit: 100 },
      );
      return envelope.data;
    },
  });
}
