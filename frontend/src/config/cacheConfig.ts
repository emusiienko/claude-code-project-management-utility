/**
 * TanStack Query cache key registry.
 *
 * All cache keys live here — never define them inline in hooks.
 * Keys use arrays so TanStack Query can invalidate at any level of granularity:
 *   invalidate CACHE_KEYS.projects.all()   → clears every projects cache entry
 *   invalidate CACHE_KEYS.projects.detail(id) → clears only that one detail entry
 *
 * Add new domain sections here as each story is implemented.
 */
export const CACHE_KEYS = {
  projects: {
    all: () => ["projects"] as const,
    list: (params?: Record<string, unknown>) =>
      ["projects", "list", params ?? {}] as const,
    detail: (id: string) => ["projects", "detail", id] as const,
    settings: (id: string) => ["projects", "settings", id] as const,
    settingsEffective: (id: string) =>
      ["projects", "settings", "effective", id] as const,
  },

  stories: {
    all: () => ["stories"] as const,
    list: (projectId: string, params?: Record<string, unknown>) =>
      ["stories", "list", projectId, params ?? {}] as const,
    listCrossProject: (params?: Record<string, unknown>) =>
      ["stories", "list", "cross-project", params ?? {}] as const,
    detail: (id: string) => ["stories", "detail", id] as const,
    richDetail: (id: string) => ["stories", "rich-detail", id] as const,
    aggregate: (id: string) => ["stories", "aggregate", id] as const,
  },

  tasks: {
    all: () => ["tasks"] as const,
    list: (storyId: string, params?: Record<string, unknown>) =>
      ["tasks", "list", storyId, params ?? {}] as const,
    listCrossProject: (params?: Record<string, unknown>) =>
      ["tasks", "list", "cross-project", params ?? {}] as const,
    detail: (id: string) => ["tasks", "detail", id] as const,
    richDetail: (id: string) => ["tasks", "rich-detail", id] as const,
    dependencies: (id: string) => ["tasks", "dependencies", id] as const,
  },

  taskLinks: {
    list: (taskId: string, params?: Record<string, unknown>) =>
      ["task-links", "list", taskId, params ?? {}] as const,
    detail: (id: string) => ["task-links", "detail", id] as const,
  },

  storyLinks: {
    list: (storyId: string, params?: Record<string, unknown>) =>
      ["story-links", "list", storyId, params ?? {}] as const,
    detail: (id: string) => ["story-links", "detail", id] as const,
  },

  attachments: {
    list: (
      containerType: string,
      containerId: string,
      params?: Record<string, unknown>,
    ) =>
      ["attachments", "list", containerType, containerId, params ?? {}] as const,
    detail: (id: string) => ["attachments", "detail", id] as const,
    /** Cached raw file text (markdown/plain/csv/json) rendered by the in-app viewer. */
    file: (id: string) => ["attachments", "file", id] as const,
  },

  comments: {
    list: (
      containerType: string,
      containerId: string,
      params?: Record<string, unknown>,
    ) =>
      ["comments", "list", containerType, containerId, params ?? {}] as const,
    detail: (id: string) => ["comments", "detail", id] as const,
    /** Ordered (root-first) ancestor lineage for a reply comment. */
    ancestors: (id: string) => ["comments", "ancestors", id] as const,
  },

  sessions: {
    all: () => ["sessions"] as const,
    list: (params?: Record<string, unknown>) =>
      ["sessions", "list", params ?? {}] as const,
    detail: (id: string) => ["sessions", "detail", id] as const,
  },

  milestones: {
    all: () => ["milestones"] as const,
    list: (params?: Record<string, unknown>) =>
      ["milestones", "list", params ?? {}] as const,
    detail: (id: string) => ["milestones", "detail", id] as const,
    richDetail: (id: string) => ["milestones", "rich-detail", id] as const,
    stories: (id: string, params?: Record<string, unknown>) =>
      ["milestones", "stories", id, params ?? {}] as const,
  },

  systemSettings: {
    all: () => ["system-settings"] as const,
  },
} as const;
