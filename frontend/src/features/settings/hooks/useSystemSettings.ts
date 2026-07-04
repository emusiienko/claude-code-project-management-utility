/**
 * TanStack Query hooks for System Settings.
 * HTTP logic lives in src/api/endpoints/settings.ts.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS } from "@/config/apiConfig";
import { getSystemSettings, updateSystemSettings } from "@/api/endpoints/settings";

/** Fetches all six system-level dictionary values. */
export function useSystemSettings() {
  return useQuery({
    queryKey: CACHE_KEYS.systemSettings.all(),
    queryFn: getSystemSettings,
    staleTime: DATA_FRESHNESS.SYSTEM_SETTINGS,
  });
}

/** Mutation: update one or more system dictionary keys. Invalidates the system settings cache. */
export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSystemSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CACHE_KEYS.systemSettings.all() });
    },
  });
}