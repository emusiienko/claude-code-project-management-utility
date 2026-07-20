/**
 * API configuration constants — pagination limits and TanStack Query stale times.
 *
 * PAGINATION: default page sizes for list endpoints — reference in hooks instead
 *   of hardcoding numbers inline.
 * DATA_FRESHNESS: TanStack Query stale times (ms) per domain — 0 means always
 *   refetch; higher values cache data that changes rarely.
 *
 * Add new entries here as each story introduces new domain queries.
 */

/** Default page sizes for each domain list endpoint. */
export const PAGINATION = {
  /** Full project list — the API maximum is 100. Used by the project selector in Settings. */
  PROJECTS: 100,
  /** Default page size for the stories list within a project. */
  STORIES: 50,
  /**
   * Board view fetches all stories in one request — use the API maximum (100).
   * A future story will add pagination or virtualization if projects exceed this.
   */
  BOARD_STORIES: 100,
  /**
   * Milestone list per project — projects are unlikely to have more than 100 milestones.
   * Fetches all milestones in one request so the Board can find the active one.
   */
  MILESTONES: 100,
  /**
   * Task list per story — fetches all tasks in one request for the Kanban board.
   * The API max is 100; stories are unlikely to exceed this in a single session.
   */
  TASKS: 100,
  /**
   * Task links per task — fetches all links in one request for the detail modal.
   * Links per task are expected to be few in a personal utility session.
   */
  TASK_LINKS: 100,
  /**
   * Story links per story — fetches all links in one request for the slide-over.
   */
  STORY_LINKS: 100,
  /**
   * Attachments per container (story/task/milestone) — fetches all in one request;
   * containers are unlikely to accumulate more than 100 attachments in a session.
   */
  ATTACHMENTS: 100,
  /**
   * Comments per container — matches the backend's generous default (a single
   * work item is expected to hold at most ~50 comments, so a typical thread
   * returns in one page); pagination remains only as a safety net.
   */
  COMMENTS: 50,
} as const;

/**
 * TanStack Query stale times (milliseconds) per domain.
 *
 * - 0   : user-generated data that changes frequently (TanStack Query default).
 * - > 0 : reference / config data that changes rarely — avoids redundant fetches.
 */
export const DATA_FRESHNESS = {
  /** System settings change infrequently — 60 s avoids redundant refetches. */
  SYSTEM_SETTINGS: 60 * 1000,
  /** Project-level overrides — same cadence as system settings. */
  PROJECT_SETTINGS: 60 * 1000,
  /** Project list — rarely changes during a working session. */
  PROJECTS: 30 * 1000,
  /** Story list — user-generated content; keep fresh but avoid redundant fetches. */
  STORIES: 0,
  /**
   * Milestone list per project — changes infrequently during a working session;
   * 30 s avoids redundant refetches when the Board polls for the active milestone.
   */
  MILESTONES: 30 * 1000,
  /** Task list — user-generated content; always fresh to reflect board changes. */
  TASKS: 0,
  /**
   * Story aggregate — recomputed on every task mutation; always refetch to keep
   * the "N/M done" counter in lockstep with the Kanban board.
   */
  STORY_AGGREGATE: 0,
  /** Task links — always fresh so the detail modal reflects recent link changes. */
  TASK_LINKS: 0,
  /** Story links — always fresh so the slide-over reflects recent link changes. */
  STORY_LINKS: 0,
  /** Attachments — always fresh so the section reflects recent uploads/deletes. */
  ATTACHMENTS: 0,
  /** Comments — user-generated content; always fresh to reflect new/edited/deleted comments. */
  COMMENTS: 0,
} as const;
