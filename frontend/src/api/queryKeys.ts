/**
 * Centralized TanStack Query key factory.
 *
 * All query keys live here — never define them inline in components or hooks.
 * Keys use arrays so TanStack Query can invalidate at any level of granularity.
 *
 * Usage:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) })
 */

export const queryKeys = {
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

  attachments: {
    list: (
      containerType: string,
      containerId: string,
      params?: Record<string, unknown>,
    ) =>
      ["attachments", "list", containerType, containerId, params ?? {}] as const,
    detail: (id: string) => ["attachments", "detail", id] as const,
    history: (id: string) => ["attachments", "history", id] as const,
  },

  comments: {
    list: (
      containerType: string,
      containerId: string,
      params?: Record<string, unknown>,
    ) =>
      ["comments", "list", containerType, containerId, params ?? {}] as const,
    detail: (id: string) => ["comments", "detail", id] as const,
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
