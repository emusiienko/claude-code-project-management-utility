/**
 * TanStack Query hooks for Project Settings (overrides + effective).
 * HTTP logic lives in src/api/endpoints/settings.ts.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS } from "@/config/apiConfig";
import type { SettingsKey, SettingsOverrides } from "@/api/types";
import {
  clearProjectOverride,
  getProjectSettings,
  getProjectSettingsEffective,
  setProjectOverride,
} from "@/api/endpoints/settings";

/** Fetches stored project overrides. Skips the request when `projectId` is undefined. */
export function useProjectSettings(projectId: string | undefined) {
  return useQuery({
    queryKey: CACHE_KEYS.projects.settings(projectId ?? ""),
    queryFn: () => getProjectSettings(projectId!),
    enabled: Boolean(projectId),
    staleTime: DATA_FRESHNESS.PROJECT_SETTINGS,
  });
}

/** Fetches the effective settings for a project. Skips the request when `projectId` is undefined. */
export function useProjectSettingsEffective(projectId: string | undefined) {
  return useQuery({
    queryKey: CACHE_KEYS.projects.settingsEffective(projectId ?? ""),
    queryFn: () => getProjectSettingsEffective(projectId!),
    enabled: Boolean(projectId),
    staleTime: DATA_FRESHNESS.PROJECT_SETTINGS,
  });
}

interface SetProjectOverrideParams {
  projectId: string;
  body: SettingsOverrides;
}

/** Mutation: set one or more project-level overrides. Invalidates overrides + effective caches. */
export function useSetProjectOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, body }: SetProjectOverrideParams) =>
      setProjectOverride(projectId, body),
    onSuccess: (_data, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: CACHE_KEYS.projects.settings(projectId) });
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.projects.settingsEffective(projectId),
      });
    },
  });
}

interface ClearProjectOverrideParams {
  projectId: string;
  key: SettingsKey;
}

/** Mutation: clear a single project override, restoring the system default. */
export function useClearProjectOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, key }: ClearProjectOverrideParams) =>
      clearProjectOverride(projectId, key),
    onSuccess: (_data, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: CACHE_KEYS.projects.settings(projectId) });
      void queryClient.invalidateQueries({
        queryKey: CACHE_KEYS.projects.settingsEffective(projectId),
      });
    },
  });
}