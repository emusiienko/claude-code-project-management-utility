/**
 * Sessions endpoint functions.
 *
 * Plain async wrappers around apiClient — one function per API endpoint.
 * Each function unwraps the response envelope and returns the domain type directly.
 * TanStack Query hooks consume these functions.
 *
 * Endpoints covered (STORY-009 — supersedes the stale v1.0 forward-spec in
 * docs/api-contract.md, reconciled at story Reconcile):
 *   POST   /v1/sessions
 *   GET    /v1/sessions?project_id&page&limit&incomplete&linked_story_id&include_archived
 *   GET    /v1/sessions/:id
 *   PUT    /v1/sessions/:id
 *   POST   /v1/sessions/:id/archive
 *   DELETE /v1/sessions/:id
 */

import { apiClient } from "@/core/client";
import { API_PATHS } from "@/api/paths";
import type {
  CreateSession,
  Envelope,
  ListEnvelope,
  Session,
  UpdateSession,
} from "@/api/types";

/** Filters supported by the project-scoped session list endpoint. */
export interface SessionFilters {
  /** Only sessions whose `status` is not `finished` (`pending` or `in-progress`). */
  incomplete?: boolean;
  /** Only sessions linked to this story. */
  linked_story_id?: string;
  /** Include archived sessions (excluded by default). */
  include_archived?: boolean;
}

/**
 * GET /v1/sessions — returns a paginated, project-scoped session list.
 *
 * There is no cross-project session listing — `project_id` is always required.
 *
 * @param projectId - Owning project ID (required).
 * @param filters   - Optional incomplete / linked-story / include-archived filters.
 * @param page      - 1-based page number (defaults to 1).
 * @param limit     - Items per page.
 */
export async function listSessions(
  projectId: string,
  filters?: SessionFilters,
  page = 1,
  limit = 20,
): Promise<ListEnvelope<Session>> {
  return apiClient.get<ListEnvelope<Session>>(API_PATHS.SESSIONS, {
    project_id: projectId,
    page,
    limit,
    ...filters,
  });
}

/**
 * POST /v1/sessions — creates a session and returns the created resource.
 *
 * @param data - Session creation payload. `status` is not settable here —
 *   every session starts at `pending`.
 */
export async function createSession(data: CreateSession): Promise<Session> {
  const envelope = await apiClient.post<Envelope<Session>>(API_PATHS.SESSIONS, data);
  return envelope.data;
}

/**
 * GET /v1/sessions/:id — returns a single session by its ID.
 *
 * @param sessionId - Session ID.
 */
export async function getSession(sessionId: string): Promise<Session> {
  const envelope = await apiClient.get<Envelope<Session>>(API_PATHS.SESSION(sessionId));
  return envelope.data;
}

/**
 * PUT /v1/sessions/:id — partial update; returns the updated session.
 *
 * `topic` / `goal` / `participant_role` / `status` are mandatory fields: omit
 * to leave unchanged, an explicit `null` is rejected by the server (422).
 * The other fields clear on explicit `null`.
 *
 * @param sessionId - Session ID.
 * @param data      - Fields to update.
 */
export async function updateSession(
  sessionId: string,
  data: UpdateSession,
): Promise<Session> {
  const envelope = await apiClient.put<Envelope<Session>>(
    API_PATHS.SESSION(sessionId),
    data,
  );
  return envelope.data;
}

/**
 * POST /v1/sessions/:id/archive — archives the session; returns the updated resource.
 * Archiving does not restrict editing — an archived session stays fully updatable.
 * Archiving an already-archived session is rejected (400).
 *
 * @param sessionId - Session ID.
 */
export async function archiveSession(sessionId: string): Promise<Session> {
  const envelope = await apiClient.post<Envelope<Session>>(
    API_PATHS.SESSION_ARCHIVE(sessionId),
  );
  return envelope.data;
}

/**
 * DELETE /v1/sessions/:id — permanently deletes the session.
 *
 * The service accepts this for any session regardless of `archived_at` or
 * `status` — the Web UI is what restricts the action to archived sessions.
 *
 * @param sessionId - Session ID.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await apiClient.delete(API_PATHS.SESSION(sessionId));
}
