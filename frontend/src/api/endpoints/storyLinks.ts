/**
 * Story links endpoint functions.
 *
 * Plain async wrappers around apiClient — one function per API operation.
 * TanStack Query hooks in src/features/story-links/hooks/ consume these functions.
 *
 * Endpoints covered (STORY-006, pending contract ratification at Reconcile):
 *   POST   /v1/stories/:storyId/links
 *   GET    /v1/stories/:storyId/links?page&limit&direction&link_type
 *   DELETE /v1/story-links/:id
 */

import { apiClient } from "@/core/client";
import { API_PATHS } from "@/api/paths";
import type {
  CreateStoryLink,
  Envelope,
  EnrichedStoryLink,
  ListEnvelope,
  StoryLink,
} from "@/api/types";

/** Filters supported by the story-link list endpoint. */
export interface StoryLinkFilters {
  direction?: "outbound" | "inbound" | "both";
  link_type?: string;
}

/**
 * POST /v1/stories/:storyId/links — creates a directed story link and returns the created resource.
 *
 * @param storyId - Source story ID.
 * @param data    - Target story ID and link type.
 */
export async function createStoryLink(
  storyId: string,
  data: CreateStoryLink,
): Promise<StoryLink> {
  const envelope = await apiClient.post<Envelope<StoryLink>>(
    API_PATHS.STORY_LINKS(storyId),
    data,
  );
  return envelope.data;
}

/**
 * GET /v1/stories/:storyId/links — returns a paginated list of enriched story links.
 *
 * Returns the full ListEnvelope so callers have access to pagination metadata.
 * Each row carries a `direction` marker and a linked-story summary.
 *
 * @param storyId - Story ID whose links are queried.
 * @param filters - Optional direction and link_type filters.
 * @param page    - 1-based page number (defaults to 1).
 * @param limit   - Items per page.
 */
export async function listStoryLinks(
  storyId: string,
  filters?: StoryLinkFilters,
  page = 1,
  limit = 100,
): Promise<ListEnvelope<EnrichedStoryLink>> {
  return apiClient.get<ListEnvelope<EnrichedStoryLink>>(
    API_PATHS.STORY_LINKS(storyId),
    { page, limit, ...filters },
  );
}

/**
 * DELETE /v1/story-links/:id — permanently deletes a story link by its own ID.
 *
 * @param linkId - Story link ID (not the story ID).
 */
export async function deleteStoryLink(linkId: string): Promise<void> {
  await apiClient.delete(API_PATHS.STORY_LINK(linkId));
}
