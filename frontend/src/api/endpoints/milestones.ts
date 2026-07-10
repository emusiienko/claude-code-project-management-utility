/**
 * Milestones endpoint functions.
 *
 * Plain async wrappers around apiClient — one function per API endpoint.
 * Each function unwraps the response envelope and returns the domain type directly.
 * TanStack Query hooks consume these functions.
 *
 * Endpoints covered (docs/api-contract.md v1.2):
 *   GET    /v1/milestones?project_id=&page=&limit=
 *   POST   /v1/milestones
 *   GET    /v1/milestones/:id
 *   PUT    /v1/milestones/:id
 *   DELETE /v1/milestones/:id
 *   POST   /v1/milestones/:id/activate
 *   POST   /v1/milestones/:id/finish
 *   GET    /v1/milestones/:id/stories?page=&limit=
 */

import { apiClient } from "@/core/client";
import { API_PATHS } from "@/api/paths";
import type {
  CreateMilestone,
  Envelope,
  ListEnvelope,
  Milestone,
  Story,
  UpdateMilestone,
} from "@/api/types";

/** Filters supported by the milestone list endpoint. */
export interface MilestoneFilters {
  project_id?: string;
}

/**
 * GET /v1/milestones — returns a paginated, optionally project-filtered milestone list.
 *
 * @param filters - Optional project_id filter.
 * @param page    - 1-based page number (defaults to 1).
 * @param limit   - Items per page.
 */
export async function listMilestones(
  filters?: MilestoneFilters,
  page = 1,
  limit = 100,
): Promise<ListEnvelope<Milestone>> {
  return apiClient.get<ListEnvelope<Milestone>>(API_PATHS.MILESTONES, {
    page,
    limit,
    ...filters,
  });
}

/**
 * POST /v1/milestones — creates a milestone and returns the created resource.
 *
 * @param data - Milestone creation payload.
 */
export async function createMilestone(data: CreateMilestone): Promise<Milestone> {
  const envelope = await apiClient.post<Envelope<Milestone>>(
    API_PATHS.MILESTONES,
    data,
  );
  return envelope.data;
}

/**
 * GET /v1/milestones/:id — returns a single milestone by its ID.
 *
 * @param milestoneId - Milestone ID.
 */
export async function getMilestone(milestoneId: string): Promise<Milestone> {
  const envelope = await apiClient.get<Envelope<Milestone>>(
    API_PATHS.MILESTONE(milestoneId),
  );
  return envelope.data;
}

/**
 * PUT /v1/milestones/:id — updates name/description and returns the updated milestone.
 * project_id is immutable after create.
 *
 * @param milestoneId - Milestone ID.
 * @param data        - Fields to update.
 */
export async function updateMilestone(
  milestoneId: string,
  data: UpdateMilestone,
): Promise<Milestone> {
  const envelope = await apiClient.put<Envelope<Milestone>>(
    API_PATHS.MILESTONE(milestoneId),
    data,
  );
  return envelope.data;
}

/**
 * DELETE /v1/milestones/:id — deletes the milestone; clears milestone_id on assigned stories.
 *
 * @param milestoneId - Milestone ID.
 */
export async function deleteMilestone(milestoneId: string): Promise<void> {
  await apiClient.delete(API_PATHS.MILESTONE(milestoneId));
}

/**
 * POST /v1/milestones/:id/activate — activates the milestone.
 *
 * Atomically demotes any previously-active milestone in the same project back to "planned".
 * Idempotent — activating an already-active milestone is a no-op success.
 *
 * @param milestoneId - Milestone ID.
 */
export async function activateMilestone(milestoneId: string): Promise<Milestone> {
  const envelope = await apiClient.post<Envelope<Milestone>>(
    API_PATHS.MILESTONE_ACTIVATE(milestoneId),
  );
  return envelope.data;
}

/**
 * POST /v1/milestones/:id/finish — marks the milestone as finished.
 *
 * Idempotent — finishing an already-finished milestone is a no-op success.
 *
 * @param milestoneId - Milestone ID.
 */
export async function finishMilestone(milestoneId: string): Promise<Milestone> {
  const envelope = await apiClient.post<Envelope<Milestone>>(
    API_PATHS.MILESTONE_FINISH(milestoneId),
  );
  return envelope.data;
}

/**
 * GET /v1/milestones/:id/stories — paginated list of stories assigned to a milestone.
 *
 * Each story includes `project_id` per the API contract.
 *
 * @param milestoneId - Milestone ID.
 * @param page        - 1-based page number (defaults to 1).
 * @param limit       - Items per page.
 */
export async function listMilestoneStories(
  milestoneId: string,
  page = 1,
  limit = 50,
): Promise<ListEnvelope<Story>> {
  return apiClient.get<ListEnvelope<Story>>(API_PATHS.MILESTONE_STORIES(milestoneId), {
    page,
    limit,
  });
}
