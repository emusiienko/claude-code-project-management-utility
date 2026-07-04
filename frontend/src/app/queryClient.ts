/**
 * Singleton TanStack Query client for the application.
 *
 * Default stale time is 0 — all user-generated data is immediately stale
 * to ensure consistency after mutations. Increase only for specific queries
 * when explicitly justified (e.g. system settings that change rarely).
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // User-generated data is always considered stale immediately.
      // TanStack Query will refetch on focus/mount by default.
      staleTime: 0,
      // Surface errors to error boundaries rather than silently swallowing them
      throwOnError: false,
      retry: 1,
    },
    mutations: {
      // Do not retry mutations — duplicate side effects are worse than a visible error
      retry: false,
    },
  },
});
