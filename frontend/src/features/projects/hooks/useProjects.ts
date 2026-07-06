/**
 * TanStack Query hooks for the Projects feature.
 *
 * List query and CRUD mutations.
 * HTTP logic lives in src/api/endpoints/projects.ts.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS, PAGINATION } from "@/config/apiConfig";
import {
  createProject,
  deleteProject,
  getProject,
  getProjects,
  updateProject,
} from "@/api/endpoints/projects";
import type { CreateProject, UpdateProject } from "@/api/types";

/** Paginated project list — used as the primary data source for the Projects screen. */
export function useProjectListFull() {
  return useQuery({
    queryKey: CACHE_KEYS.projects.list(),
    queryFn: () => getProjects(PAGINATION.PROJECTS),
    staleTime: DATA_FRESHNESS.PROJECTS,
  });
}

/** Fetches a single project by ID. */
export function useProjectDetail(id: string) {
  return useQuery({
    queryKey: CACHE_KEYS.projects.detail(id),
    queryFn: () => getProject(id),
    staleTime: DATA_FRESHNESS.PROJECTS,
    enabled: Boolean(id),
  });
}

/** Mutation: create a project. Invalidates the project list on success. */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProject) => createProject(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CACHE_KEYS.projects.all() });
    },
  });
}

/** Mutation: update a project's name and/or description. Invalidates both list and detail caches. */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProject }) =>
      updateProject(id, body),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: CACHE_KEYS.projects.all() });
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.projects.detail(updated.id),
      });
    },
  });
}

/** Mutation: delete a project and all its nested data. Invalidates the project list on success. */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CACHE_KEYS.projects.all() });
    },
  });
}
