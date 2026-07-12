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

  // ---------------------------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------------------------

  /**
   * GET  /v1/milestones?project_id=&page=&limit= — list milestones (filter by project).
   * POST /v1/milestones — create a milestone.
   */
  MILESTONES: "/v1/milestones",

  /**
   * GET    /v1/milestones/:id — fetch a single milestone.
   * PUT    /v1/milestones/:id — update a milestone (name/description only).
   * DELETE /v1/milestones/:id — delete a milestone.
   */
  MILESTONE: (id: string) => `/v1/milestones/${id}`,

  /** POST /v1/milestones/:id/activate — activate a milestone. */
  MILESTONE_ACTIVATE: (id: string) => `/v1/milestones/${id}/activate`,

  /** POST /v1/milestones/:id/finish — finish a milestone. */
  MILESTONE_FINISH: (id: string) => `/v1/milestones/${id}/finish`,

  /** GET /v1/milestones/:id/stories — paginated list of stories assigned to this milestone. */
  MILESTONE_STORIES: (id: string) => `/v1/milestones/${id}/stories`,

  // ---------------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------------

  /**
   * POST /v1/stories/:storyId/tasks — create a task under a story.
   * GET  /v1/stories/:storyId/tasks?page&limit&status&type&assignee_role&creator_role — paginated, filtered list.
   */
  STORY_TASKS: (storyId: string) => `/v1/stories/${storyId}/tasks`,

  /**
   * GET    /v1/tasks/:id — fetch a single task.
   * PUT    /v1/tasks/:id — update a task (story_id immutable).
   * DELETE /v1/tasks/:id — permanently delete a task.
   */
  TASK: (id: string) => `/v1/tasks/${id}`,

  /**
   * GET /v1/tasks/:id/detail — fetch a task with its links, attachments, and comments.
   * Returns empty arrays for links/attachments/comments until STORY-006/007/008.
   */
  TASK_DETAIL: (id: string) => `/v1/tasks/${id}/detail`,

  // ---------------------------------------------------------------------------
  // Story aggregate
  // ---------------------------------------------------------------------------

  /**
   * GET /v1/stories/:id/aggregate — on-demand per-status task count for a story.
   * Returns { story_id, total_tasks, by_status }.
   */
  STORY_AGGREGATE: (id: string) => `/v1/stories/${id}/aggregate`,
} as const;