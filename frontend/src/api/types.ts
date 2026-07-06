/**
 * Canonical TypeScript types derived from docs/api-contract.md v1.0 (LOCKED).
 * These are the single source of truth for all API shapes in the frontend.
 * Never redeclare these inline in components or screens.
 */

// ---------------------------------------------------------------------------
// Shared envelope types
// ---------------------------------------------------------------------------

/** Single-resource success envelope returned by all create/read/update endpoints. */
export interface Envelope<T> {
  data: T;
}

/** Paginated list envelope returned by all list endpoints. */
export interface ListEnvelope<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Standard API error shape. `details` is omitted when not applicable. */
export interface ApiError {
  error: string;
  code:
    | "VALIDATION_ERROR"
    | "NOT_FOUND"
    | "CONFLICT"
    | "UNPROCESSABLE"
    | "INTERNAL_ERROR";
  details?: { field: string; message: string }[];
}

/** Common pagination query parameters supported by every list endpoint. */
export interface Pagination {
  page?: number;
  limit?: number;
}

/** Free-form label attached to various entities. */
export interface Label {
  key: string;
  value: string;
}

// ---------------------------------------------------------------------------
// Domain entities
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Story {
  id: string;
  project_id: string;
  title: string;
  content: string | null;
  status: string | null;
  labels: Label[];
  milestone_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  story_id: string;
  title: string;
  content: string | null;
  type: string;
  status: string;
  assignee_role: string | null;
  creator_role: string | null;
  labels: Label[];
  created_at: string;
  updated_at: string;
}

export interface TaskLink {
  id: string;
  source_task_id: string;
  target_task_id: string;
  link_type: string;
  created_at: string;
}

export interface EnrichedTaskLink extends TaskLink {
  direction?: "outbound" | "inbound";
  linked_task: {
    id: string;
    title: string;
    status: string;
  };
}

export type AttachmentKind = "document" | "image" | "external-ref";
export type ContainerType = "story" | "task" | "milestone";

export interface Attachment {
  id: string;
  container_type: ContainerType;
  container_id: string;
  type: string;
  kind: AttachmentKind;
  mime_type: string | null;
  file_size_bytes: number | null;
  archived_at: string | null;
  external_url: string | null;
  external_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttachmentVersion {
  id: string;
  attachment_id: string;
  file_size_bytes: number;
  author_role: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  container_type: ContainerType;
  container_id: string;
  author_role: string | null;
  content: string;
  labels: Label[];
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  topic: string;
  context: string | null;
  result_decisions: string | null;
  result_summary: string | null;
  status: string | null;
  participant_role: string | null;
  linked_story_id: string | null;
  linked_task_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  name: string;
  description: string | null;
  project_ids: string[];
  story_count?: number;
  created_at: string;
  updated_at: string;
}

export type DictionaryKey =
  | "task_statuses"
  | "task_types"
  | "story_statuses"
  | "attachment_types"
  | "link_types"
  | "participant_roles";

/** Full set of six system dictionaries. */
export type Settings = Record<DictionaryKey, string[]>;

/** Partial project-level overrides — only provided keys are present. */
export type SettingsOverrides = Partial<Record<DictionaryKey, string[]>>;

// ---------------------------------------------------------------------------
// Composed / aggregate types
// ---------------------------------------------------------------------------

export interface StoryAggregate {
  story_id: string;
  total_tasks: number;
  by_status: Record<string, number>;
}

export interface StoryDetail extends Story {
  attachments: Attachment[];
  comments: Comment[];
}

export interface TaskDetail extends Task {
  links: EnrichedTaskLink[];
  attachments: Attachment[];
  comments: Comment[];
}

export interface TaskDependencies {
  task_id: string;
  inbound_depends_on: {
    task_id: string;
    task_title: string;
    task_status: string;
  }[];
}

export interface MilestoneDetail extends Milestone {
  attachments: Attachment[];
  comments: Comment[];
}

// ---------------------------------------------------------------------------
// Request body types
// ---------------------------------------------------------------------------

export interface CreateProject {
  name: string;
  description?: string;
}

export interface UpdateProject {
  name?: string;
  description?: string;
}

export interface CreateStory {
  title: string;
  content?: string;
  status?: string;
  labels?: Label[];
  milestone_id?: string | null;
}

export interface UpdateStory {
  title?: string;
  content?: string;
  status?: string;
  labels?: Label[];
  milestone_id?: string | null;
}

export interface CreateTask {
  title: string;
  content?: string;
  type: string;
  status: string;
  assignee_role?: string;
  creator_role?: string;
  labels?: Label[];
}

export interface UpdateTask {
  title?: string;
  content?: string;
  type?: string;
  status?: string;
  assignee_role?: string;
  creator_role?: string;
  labels?: Label[];
}

export interface CreateTaskLink {
  target_task_id: string;
  link_type: string;
}

export interface CreateDocumentAttachment {
  type: string;
  kind: "document";
  content: string;
  mime_type: "text/markdown" | "text/plain";
  author_role?: string;
}

export interface CreateExternalRefAttachment {
  type: string;
  kind: "external-ref";
  external_url: string;
  external_status?: string;
}

export interface CreateComment {
  content: string;
  author_role?: string;
  labels?: Label[];
}

export interface UpdateComment {
  content?: string;
  labels?: Label[];
}

export interface CreateSession {
  topic: string;
  context?: string;
  status?: string;
  participant_role?: string;
  linked_story_id?: string;
  linked_task_id?: string;
}

export interface UpdateSession {
  status?: string;
  context?: string;
  result_decisions?: string;
  result_summary?: string;
  participant_role?: string;
  linked_story_id?: string | null;
  linked_task_id?: string | null;
}

export interface CreateMilestone {
  name: string;
  project_ids: string[];
  description?: string;
}

export interface UpdateMilestone {
  name?: string;
  description?: string;
  project_ids?: string[];
}
