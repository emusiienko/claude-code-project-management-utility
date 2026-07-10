/**
 * Stories endpoint functions.
 *
 * Plain async wrappers around apiClient — one function per API endpoint.
 * Each function unwraps the response envelope and returns the domain type directly.
 * TanStack Query hooks in src/features/stories/hooks/ consume these functions.
 *
 * Endpoints covered (docs/api-contract.md v1.0):
 *   GET    /v1/stories?project_id=
 *   POST   /v1/stories
 *   GET    /v1/stories/:id
 *   PUT    /v1/stories/:id
 *   DELETE /v1/stories/:id
 *
 * Note: GET /v1/stories/:id/aggregate is out of scope (STORY-005).
 */

import { apiClient } from "@/core/client";
import { API_PATHS } from "@/api/paths";
import type {
  CreateStory,
  Envelope,
  ListEnvelope,
  Story,
  UpdateStory,
} from "@/api/types";

/** Filters supported by the story list endpoint. */
export interface StoryFilters {
  status?: string;
  label_key?: string;
  label_value?: string;
  /** v1.2: filter to stories assigned to this milestone ID. */
  milestone_id?: string;
}

/**
 * GET /v1/stories?project_id= — returns a paginated, optionally filtered story list.
 *
 * @param projectId - Owning project ID (passed as query param).
 * @param filters   - Optional status / label_key / label_value filters.
 * @param page      - 1-based page number (defaults to 1).
 * @param limit     - Items per page.
 */
export async function listStories(
  projectId: string,
  filters?: StoryFilters,
  page = 1,
  limit = 50,
): Promise<ListEnvelope<Story>> {
  return apiClient.get<ListEnvelope<Story>>(API_PATHS.STORIES, {
    project_id: projectId,
    page,
    limit,
    ...filters,
  });
}

/**
 * POST /v1/stories — creates a story and returns the created resource.
 *
 * @param projectId - Owning project ID (included in the request body as project_id).
 * @param data      - Story creation payload.
 */
export async function createStory(projectId: string, data: CreateStory): Promise<Story> {
  const envelope = await apiClient.post<Envelope<Story>>(API_PATHS.STORIES, {
    ...data,
    project_id: projectId,
  });
  return envelope.data;
}

/**
 * GET /v1/stories/:id — returns a single story by its own ID.
 *
 * @param storyId - Story ID.
 */
export async function getStory(storyId: string): Promise<Story> {
  const envelope = await apiClient.get<Envelope<Story>>(API_PATHS.STORY(storyId));
  return envelope.data;
}

/**
 * PUT /v1/stories/:id — updates a story and returns the updated resource.
 *
 * @param storyId - Story ID.
 * @param data    - Fields to update; providing `labels: []` clears all labels.
 */
export async function updateStory(storyId: string, data: UpdateStory): Promise<Story> {
  const envelope = await apiClient.put<Envelope<Story>>(API_PATHS.STORY(storyId), data);
  return envelope.data;
}

/**
 * DELETE /v1/stories/:id — permanently deletes the story and all nested data.
 *
 * @param storyId - Story ID.
 */
export async function deleteStory(storyId: string): Promise<void> {
  await apiClient.delete(API_PATHS.STORY(storyId));
}
