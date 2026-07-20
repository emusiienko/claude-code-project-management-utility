/**
 * Shared timestamp formatter — promoted from the Attachments feature (STORY-007)
 * to `shared/` when the Comments feature (STORY-008) became a second consumer.
 */

/** Formats an ISO 8601 timestamp as a short locale date + time (e.g. "Jul 14, 2026, 10:00 AM"). */
export function formatTimestamp(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
