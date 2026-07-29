/**
 * TanStack Query hooks for the Sessions feature.
 *
 * Sessions are always project-scoped — there is no cross-project list or
 * cross-project incomplete-sessions query. List/mutation hooks take the
 * active project ID so cache invalidation stays scoped to it, mirroring the
 * story-scoped Tasks hooks.
 *
 * HTTP logic lives in src/api/endpoints/sessions.ts.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS, PAGINATION } from "@/config/apiConfig";
import {
  archiveSession,
  createSession,
  getSession,
  listSessions,
  updateSession,
  type SessionFilters,
} from "@/api/endpoints/sessions";
import type { CreateSession, UpdateSession } from "@/api/types";

export type { SessionFilters };

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Paginated, filtered session list scoped to a single project.
 *
 * The query key includes all filter params so each distinct filter
 * combination (incomplete-only, linked-story, include-archived) has its own
 * cache entry. `list_sessions(project_id, incomplete=true)` is the same query
 * an orchestrator agent uses over MCP for cross-restart continuity.
 *
 * @param projectId - Owning project ID. Query is disabled when empty.
 * @param filters   - Optional incomplete / linked-story / include-archived filters.
 * @param page      - 1-based page number (defaults to 1).
 */
export function useSessionList(
  projectId: string,
  filters?: SessionFilters,
  page = 1,
) {
  return useQuery({
    queryKey: CACHE_KEYS.sessions.list(projectId, { ...filters, page }),
    queryFn: () => listSessions(projectId, filters, page, PAGINATION.SESSIONS),
    staleTime: DATA_FRESHNESS.SESSIONS,
    enabled: Boolean(projectId),
  });
}

/**
 * Fetches a single session by ID.
 *
 * @param sessionId - Session ID. Query is disabled when empty.
 */
export function useSession(sessionId: string) {
  return useQuery({
    queryKey: CACHE_KEYS.sessions.detail(sessionId),
    queryFn: () => getSession(sessionId),
    staleTime: DATA_FRESHNESS.SESSIONS,
    enabled: Boolean(sessionId),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Mutation: create a session under a project.
 *
 * Invalidates the project's session list on success.
 *
 * @param projectId - Owning project ID — required to scope cache invalidation.
 */
export function useCreateSession(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSession) => createSession(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.sessions.list(projectId),
      });
    },
  });
}

/**
 * Mutation: partially update a session (topic/goal/context/status/
 * participant_role/result fields/is_complete/linked ids).
 *
 * Invalidates the project's session list and the affected session's detail.
 *
 * @param projectId - Owning project ID — required to scope cache invalidation.
 */
export function useUpdateSession(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: UpdateSession;
    }) => updateSession(sessionId, data),
    onSuccess: (_updated, { sessionId }) => {
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.sessions.list(projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.sessions.detail(sessionId),
      });
    },
  });
}

/**
 * Mutation: archive a session. Archiving does not restrict editing — an
 * archived session remains fully updatable.
 *
 * Invalidates the project's session list and the affected session's detail.
 *
 * @param projectId - Owning project ID — required to scope cache invalidation.
 */
export function useArchiveSession(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => archiveSession(sessionId),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.sessions.list(projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.sessions.detail(updated.id),
      });
    },
  });
}
