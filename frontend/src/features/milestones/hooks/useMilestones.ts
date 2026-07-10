/**
 * TanStack Query hooks for the Milestones feature.
 *
 * List query (scoped to a project) and CRUD + lifecycle mutations.
 * HTTP logic lives in src/api/endpoints/milestones.ts.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS, PAGINATION } from "@/config/apiConfig";
import {
  activateMilestone,
  createMilestone,
  deleteMilestone,
  finishMilestone,
  getMilestone,
  listMilestones,
  listMilestoneStories,
  updateMilestone,
} from "@/api/endpoints/milestones";
import type { CreateMilestone, UpdateMilestone } from "@/api/types";

/**
 * Paginated milestone list scoped to a single project.
 *
 * Fetches all milestones in one request (up to PAGINATION.MILESTONES = 100)
 * so callers can inspect status without further pagination.
 *
 * @param projectId - Owning project ID. Query is disabled when empty.
 */
export function useProjectMilestones(projectId: string) {
  return useQuery({
    queryKey: CACHE_KEYS.milestones.list({ project_id: projectId }),
    queryFn: () =>
      listMilestones({ project_id: projectId }, 1, PAGINATION.MILESTONES),
    staleTime: DATA_FRESHNESS.MILESTONES,
    enabled: Boolean(projectId),
  });
}

/**
 * Fetches a single milestone by ID.
 *
 * @param milestoneId - Milestone ID. Query is disabled when empty.
 */
export function useMilestone(milestoneId: string) {
  return useQuery({
    queryKey: CACHE_KEYS.milestones.detail(milestoneId),
    queryFn: () => getMilestone(milestoneId),
    staleTime: DATA_FRESHNESS.MILESTONES,
    enabled: Boolean(milestoneId),
  });
}

/**
 * Mutation: create a milestone under a project.
 * Invalidates the milestone list on success.
 */
export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMilestone) => createMilestone(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CACHE_KEYS.milestones.all() });
    },
  });
}

/**
 * Mutation: update a milestone's name and/or description.
 * Invalidates the milestone list and detail on success.
 */
export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, data }: { milestoneId: string; data: UpdateMilestone }) =>
      updateMilestone(milestoneId, data),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: CACHE_KEYS.milestones.all() });
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.milestones.detail(updated.id),
      });
    },
  });
}

/**
 * Mutation: delete a milestone. Sets milestone_id = null on assigned stories.
 * Invalidates the milestone list and the story list (stories lost their milestone_id).
 */
export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) => deleteMilestone(milestoneId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CACHE_KEYS.milestones.all() });
      // Invalidate stories because their milestone_id was cleared server-side
      void queryClient.invalidateQueries({ queryKey: CACHE_KEYS.stories.all() });
    },
  });
}

/**
 * Mutation: activate a milestone (atomically demotes any currently-active one).
 * Invalidates all milestones for the project.
 */
export function useActivateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) => activateMilestone(milestoneId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CACHE_KEYS.milestones.all() });
    },
  });
}

/**
 * Mutation: finish a milestone.
 * Invalidates all milestones.
 */
export function useFinishMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) => finishMilestone(milestoneId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CACHE_KEYS.milestones.all() });
    },
  });
}

/**
 * Paginated list of stories assigned to a milestone.
 *
 * @param milestoneId - Milestone ID. Query is disabled when empty.
 * @param page        - 1-based page number.
 */
export function useMilestoneStories(milestoneId: string, page = 1) {
  return useQuery({
    queryKey: CACHE_KEYS.milestones.stories(milestoneId, { page }),
    queryFn: () => listMilestoneStories(milestoneId, page, PAGINATION.STORIES),
    staleTime: DATA_FRESHNESS.STORIES,
    enabled: Boolean(milestoneId),
  });
}
