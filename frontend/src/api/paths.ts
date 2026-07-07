/**
 * Centralized API path constants.
 *
 * All URL path strings live here — never inline in endpoint functions or hooks.
 * Parameterized paths are factory functions returning the resolved string.
 *
 * Add new domain sections here as each story is implemented.
 */
export const API_PATHS = {
  // ---------------------------------------------------------------------------
  // System settings
  // ---------------------------------------------------------------------------
  SYSTEM_SETTINGS: "/v1/system/settings",

  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------
  PROJECTS: "/v1/projects",
  PROJECT: (id: string) => `/v1/projects/${id}`,

  // ---------------------------------------------------------------------------
  // Project settings
  // ---------------------------------------------------------------------------
  PROJECT_SETTINGS: (projectId: string) => `/v1/projects/${projectId}/settings`,
  PROJECT_SETTINGS_EFFECTIVE: (projectId: string) =>
    `/v1/projects/${projectId}/settings/effective`,
  /** DELETE /v1/projects/:projectId/settings/:key — clears a single override. */
  PROJECT_SETTINGS_KEY: (projectId: string, key: string) =>
    `/v1/projects/${projectId}/settings/${key}`,

  // ---------------------------------------------------------------------------
  // Stories
  // ---------------------------------------------------------------------------

  /**
   * GET  /v1/stories?project_id=&page=&limit=&status=&label_key=&label_value= — paginated, filtered list.
   * POST /v1/stories — create a story (project_id in request body).
   */
  STORIES: "/v1/stories",

  /**
   * GET    /v1/stories/:id — fetch a single story.
   * PUT    /v1/stories/:id — update a story.
   * DELETE /v1/stories/:id — permanently delete a story.
   */
  STORY: (id: string) => `/v1/stories/${id}`,
} as const;