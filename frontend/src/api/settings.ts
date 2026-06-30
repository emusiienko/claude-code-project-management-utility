/**
 * TanStack Query hooks for the Settings domain.
 *
 * Consumes the locked v1.0 API contract:
 *   GET  /v1/system/settings
 *   PUT  /v1/system/settings
 *   GET  /v1/projects/:projectId/settings
 *   GET  /v1/projects/:projectId/settings/effective
 *   PUT  /v1/projects/:projectId/settings
 *   DELETE /v1/projects/:projectId/settings/:key
 *
 * All HTTP calls go through `src/api/client.ts`. Error handling follows the
 * shared `ApiRequestError` convention — mutation hooks surface errors via `onError`.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { queryKeys } from "@/api/queryKeys";
import type {
  DictionaryKey,
  Envelope,
  Settings,
  SettingsOverrides,
} from "@/api/types";

// ---------------------------------------------------------------------------
// System settings
// ---------------------------------------------------------------------------

/**
 * Fetches all six system-level dictionary values.
 * Returns an `Envelope<Settings>` unwrapped to `Settings`.
 */
export function useSystemSettings() {
  return useQuery({
    queryKey: queryKeys.systemSettings.all(),
    queryFn: async () => {
      const envelope = await apiClient.get<Envelope<Settings>>(
        "/v1/system/settings",
      );
      return envelope.data;
    },
  });
}

/** Shape of the body sent to PUT /v1/system/settings. */
type UpdateSystemSettingsBody = Partial<Record<DictionaryKey, string[]>>;

/**
 * Mutation: update one or more system dictionary keys.
 *
 * Body is `Partial<Settings>` — only provided keys are updated.
 * Invalidates `systemSettings.all` on success so every screen that shows
 * system defaults receives fresh data.
 *
 * Errors (400 unknown key / empty values) are surfaced via `onError`.
 */
export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateSystemSettingsBody) => {
      const envelope = await apiClient.put<Envelope<Settings>>(
        "/v1/system/settings",
        body,
      );
      return envelope.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.systemSettings.all(),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Project settings — stored overrides only
// ---------------------------------------------------------------------------

/**
 * Fetches the project-level overrides for a given project.
 * Returns `SettingsOverrides` (an empty object `{}` when the project has none).
 * Skips the request when `projectId` is undefined (no project selected).
 */
export function useProjectSettings(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.settings(projectId ?? ""),
    queryFn: async () => {
      const envelope = await apiClient.get<Envelope<SettingsOverrides>>(
        `/v1/projects/${projectId}/settings`,
      );
      return envelope.data;
    },
    enabled: Boolean(projectId),
  });
}

// ---------------------------------------------------------------------------
// Project settings — effective (system defaults merged with project overrides)
// ---------------------------------------------------------------------------

/**
 * Fetches the effective settings for a given project.
 * Effective = project override if present, else system default (resolved server-side).
 * Skips the request when `projectId` is undefined.
 */
export function useProjectSettingsEffective(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.settingsEffective(projectId ?? ""),
    queryFn: async () => {
      const envelope = await apiClient.get<Envelope<Settings>>(
        `/v1/projects/${projectId}/settings/effective`,
      );
      return envelope.data;
    },
    enabled: Boolean(projectId),
  });
}

// ---------------------------------------------------------------------------
// Project settings — set override
// ---------------------------------------------------------------------------

/** Parameters for the set-override mutation. */
interface SetProjectOverrideParams {
  projectId: string;
  /** Partial<Settings> — only provided keys are updated. */
  body: Partial<Record<DictionaryKey, string[]>>;
}

/**
 * Mutation: set one or more project-level overrides.
 *
 * Returns the full effective Settings after the update (as per the contract).
 * Invalidates both the overrides query and the effective query for the project
 * so both views refresh immediately.
 *
 * Errors (400 empty/unknown key, 404 missing project) are surfaced via `onError`.
 */
export function useSetProjectOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, body }: SetProjectOverrideParams) => {
      const envelope = await apiClient.put<Envelope<Settings>>(
        `/v1/projects/${projectId}/settings`,
        body,
      );
      return envelope.data;
    },
    onSuccess: (_data, { projectId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.settings(projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.settingsEffective(projectId),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Project settings — clear a single key override
// ---------------------------------------------------------------------------

/** Parameters for the clear-override mutation. */
interface ClearProjectOverrideParams {
  projectId: string;
  key: DictionaryKey;
}

/**
 * Mutation: clear a single project-level override, restoring the system default.
 *
 * Invalidates the overrides and effective settings queries for the project.
 */
export function useClearProjectOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, key }: ClearProjectOverrideParams) => {
      await apiClient.delete<null>(
        `/v1/projects/${projectId}/settings/${key}`,
      );
    },
    onSuccess: (_data, { projectId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.settings(projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.settingsEffective(projectId),
      });
    },
  });
}
