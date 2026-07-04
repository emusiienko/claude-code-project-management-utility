/**
 * API configuration constants — pagination limits and TanStack Query stale times.
 *
 * PAGINATION: default page sizes for list endpoints — reference in hooks instead
 *   of hardcoding numbers inline.
 * DATA_FRESHNESS: TanStack Query stale times (ms) per domain — 0 means always
 *   refetch; higher values cache data that changes rarely.
 *
 * Add new entries here as each story introduces new domain queries.
 */

/** Default page sizes for each domain list endpoint. */
export const PAGINATION = {
  /** Full project list — the API maximum is 100. Used by the project selector in Settings. */
  PROJECTS: 100,
} as const;

/**
 * TanStack Query stale times (milliseconds) per domain.
 *
 * - 0   : user-generated data that changes frequently (TanStack Query default).
 * - > 0 : reference / config data that changes rarely — avoids redundant fetches.
 */
export const DATA_FRESHNESS = {
  /** System settings change infrequently — 60 s avoids redundant refetches. */
  SYSTEM_SETTINGS: 60 * 1000,
  /** Project-level overrides — same cadence as system settings. */
  PROJECT_SETTINGS: 60 * 1000,
  /** Project list — rarely changes during a working session. */
  PROJECTS: 30 * 1000,
} as const;
