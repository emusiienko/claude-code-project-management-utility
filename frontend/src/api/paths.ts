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

  // ---------------------------------------------------------------------------
  // Task links
  // ---------------------------------------------------------------------------

  /**
   * POST /v1/tasks/:taskId/links — create a task link.
   * GET  /v1/tasks/:taskId/links?page&limit&direction&link_type — list enriched task links.
   */
  TASK_LINKS: (taskId: string) => `/v1/tasks/${taskId}/links`,

  /**
   * DELETE /v1/task-links/:id — delete a task link by its own ID.
   */
  TASK_LINK: (id: string) => `/v1/task-links/${id}`,

  // ---------------------------------------------------------------------------
  // Story links
  // ---------------------------------------------------------------------------

  /**
   * POST /v1/stories/:storyId/links — create a story link.
   * GET  /v1/stories/:storyId/links?page&limit&direction&link_type — list enriched story links.
   */
  STORY_LINKS: (storyId: string) => `/v1/stories/${storyId}/links`,

  /**
   * DELETE /v1/story-links/:id — delete a story link by its own ID.
   */
  STORY_LINK: (id: string) => `/v1/story-links/${id}`,

  // ---------------------------------------------------------------------------
  // Attachments
  // ---------------------------------------------------------------------------

  /**
   * POST /v1/stories/:storyId/attachments — create (JSON for document-text/external-ref, multipart for file uploads).
   * GET  /v1/stories/:storyId/attachments?page&limit&type&kind — paginated, filtered list.
   */
  STORY_ATTACHMENTS: (storyId: string) => `/v1/stories/${storyId}/attachments`,

  /**
   * POST /v1/tasks/:taskId/attachments — create (JSON or multipart).
   * GET  /v1/tasks/:taskId/attachments?page&limit&type&kind — paginated, filtered list.
   */
  TASK_ATTACHMENTS: (taskId: string) => `/v1/tasks/${taskId}/attachments`,

  /**
   * POST /v1/milestones/:id/attachments — create (JSON or multipart).
   * GET  /v1/milestones/:id/attachments?page&limit&type&kind — paginated, filtered list.
   */
  MILESTONE_ATTACHMENTS: (id: string) => `/v1/milestones/${id}/attachments`,

  /**
   * GET    /v1/attachments/:id — fetch attachment metadata.
   * DELETE /v1/attachments/:id — permanently delete (every kind; no update, no archive).
   */
  ATTACHMENT: (id: string) => `/v1/attachments/${id}`,

  /**
   * GET /v1/attachments/:id/file — download or view the stored file.
   * Not applicable to external-ref (400 — no stored file).
   */
  ATTACHMENT_FILE: (id: string) => `/v1/attachments/${id}/file`,

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------

  /**
   * POST /v1/stories/:storyId/comments — create a comment on a story.
   * GET  /v1/stories/:storyId/comments?page&limit&label_key&label_value&after_id&descendant_of
   */
  STORY_COMMENTS: (storyId: string) => `/v1/stories/${storyId}/comments`,

  /**
   * POST /v1/tasks/:taskId/comments — create a comment on a task.
   * GET  /v1/tasks/:taskId/comments?page&limit&label_key&label_value&after_id&descendant_of
   */
  TASK_COMMENTS: (taskId: string) => `/v1/tasks/${taskId}/comments`,

  /**
   * POST /v1/milestones/:id/comments — create a comment on a milestone.
   * GET  /v1/milestones/:id/comments?page&limit&label_key&label_value&after_id&descendant_of
   */
  MILESTONE_COMMENTS: (id: string) => `/v1/milestones/${id}/comments`,

  /**
   * GET    /v1/comments/:id — fetch a single comment.
   * PUT    /v1/comments/:id — update content and/or labels (author_role/ancestors immutable).
   * DELETE /v1/comments/:id — permanently delete a comment.
   */
  COMMENT: (id: string) => `/v1/comments/${id}`,

  /**
   * GET /v1/comments/:id/ancestors — ordered (root-first) ancestor comment bodies.
   * Returns a bare Comment[], not a paginated envelope.
   */
  COMMENT_ANCESTORS: (id: string) => `/v1/comments/${id}/ancestors`,
} as const;