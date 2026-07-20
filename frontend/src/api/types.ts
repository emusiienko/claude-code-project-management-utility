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

export interface StoryLink {
  id: string;
  source_story_id: string;
  target_story_id: string;
  link_type: string;
  created_at: string;
}

export interface EnrichedStoryLink extends StoryLink {
  direction?: "outbound" | "inbound";
  linked_story: {
    id: string;
    title: string;
    status: string | null;
  };
}

/**
 * v1.5 — "file" is a new opaque-binary kind (PDF/DOCX/XLSX/PPTX/CSV/TXT/JSON/ZIP).
 * Archive and version history were removed in the same revision.
 */
export type AttachmentKind = "document" | "image" | "file" | "external-ref";
/** The three kinds whose content is written to disk (as opposed to external-ref). */
export type StoredFileAttachmentKind = Extract<
  AttachmentKind,
  "document" | "image" | "file"
>;
export type ContainerType = "story" | "task" | "milestone";

/**
 * v1.5 — immutable: no update endpoint, no archive, no version history.
 * `author_role` moved onto this entity (previously on the removed AttachmentVersion).
 */
export interface Attachment {
  id: string;
  container_type: ContainerType;
  container_id: string;
  title: string;
  kind: AttachmentKind;
  mime_type: string | null;
  file_size_bytes: number | null;
  external_url: string | null;
  external_status: string | null;
  author_role: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * `author_role` is required and immutable (set once at creation, never updatable).
 * `ancestors` is the immutable, root-first materialized reply path — empty for a
 * top-level comment; a reply's direct parent is `ancestors[ancestors.length - 1]`.
 */
export interface Comment {
  id: string;
  container_type: ContainerType;
  container_id: string;
  author_role: string;
  content: string;
  labels: Label[];
  ancestors: string[];
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

/** Lifecycle status for a milestone — lowercase on the wire; UI capitalises. */
export type MilestoneStatus = "planned" | "active" | "finished";

export interface Milestone {
  id: string;
  name: string;
  description: string | null;
  /** Single owning project (v1.2 — replaces former project_ids[]). */
  project_id: string;
  status: MilestoneStatus;
  /** Included in list/detail responses. */
  story_count?: number;
  created_at: string;
  updated_at: string;
}

export type DictionaryKey =
  | "task_statuses"
  | "task_types"
  | "story_statuses"
  | "link_types"
  | "participant_roles";

/**
 * A single structured entry in the link_types dictionary.
 * Carries both directional display labels alongside the machine key.
 */
export interface LinkTypeEntry {
  /** Machine key stored in TaskLink.link_type / StoryLink.link_type columns. */
  value: string;
  /** Human-readable label when the viewed item is the source of the relationship. */
  outbound: string;
  /** Human-readable label when the viewed item is the target of the relationship. */
  inbound: string;
}

/** The four plain-string dictionary keys (all except link_types). */
type PlainStringDictionaryKey = Exclude<DictionaryKey, "link_types">;

/**
 * Any settings key, dictionary or scalar. `default_web_ui_role` (STORY-008) is the
 * first scalar (single-value) key in the settings store, alongside the five
 * list-valued dictionaries.
 */
export type SettingsKey = DictionaryKey | "default_web_ui_role";

/**
 * Full set of six system settings: five dictionaries plus the scalar
 * `default_web_ui_role`. link_types entries are structured objects.
 */
export interface Settings extends Record<PlainStringDictionaryKey, string[]> {
  link_types: LinkTypeEntry[];
  /** Pre-fills a new comment's author_role in the Web UI. Must be a member of participant_roles. */
  default_web_ui_role: string;
}

/** Partial project-level overrides — only provided keys are present. */
export interface SettingsOverrides extends Partial<Record<PlainStringDictionaryKey, string[]>> {
  link_types?: LinkTypeEntry[];
  default_web_ui_role?: string;
}

// ---------------------------------------------------------------------------
// Composed / aggregate types
// ---------------------------------------------------------------------------

export interface StoryAggregate {
  story_id: string;
  total_tasks: number;
  by_status: Record<string, number>;
}

export interface StoryDetail extends Story {
  links: EnrichedStoryLink[];
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

export interface CreateStoryLink {
  target_story_id: string;
  link_type: string;
}

/** REST JSON / MCP create input for a document supplied as inline UTF-8 text. */
export interface CreateDocumentAttachment {
  title: string;
  kind: "document";
  content: string;
  mime_type: "text/markdown" | "text/plain";
  author_role?: string;
}

/** REST JSON / MCP create input for an external-reference attachment (no stored file). */
export interface CreateExternalRefAttachment {
  title: string;
  kind: "external-ref";
  external_url: string;
  external_status?: string;
  author_role?: string;
}

/**
 * Multipart form fields for any stored-file kind (document-as-file, image, file).
 * The binary itself is appended separately as the `file` form field.
 */
export interface CreateStoredFileAttachment {
  title: string;
  kind: StoredFileAttachmentKind;
  mime_type: string;
  author_role?: string;
  file: File;
}

/**
 * `in_reply_to` is request-only — the server validates it (existence + same
 * container) and derives the persisted, immutable `ancestors` path from it;
 * it is never itself returned or stored as its own field.
 */
export interface CreateComment {
  content: string;
  author_role: string;
  labels?: Label[];
  in_reply_to?: string;
}

/** `author_role` and `ancestors` are immutable — not present here, ignored if sent. */
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
  project_id: string;
  description?: string;
}

export interface UpdateMilestone {
  name?: string;
  description?: string;
}
