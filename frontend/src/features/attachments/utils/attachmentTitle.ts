/**
 * Attachment title constraints — mirrors the backend's `TITLE_MAX_LENGTH`
 * (single source of truth: docs/api-contract.md, Attachments section).
 */

export const TITLE_MAX_LENGTH = 500;

/** Truncates a candidate title (e.g. an uploaded file's name) to the max length. */
export function truncateTitle(candidate: string): string {
  return candidate.length > TITLE_MAX_LENGTH
    ? candidate.slice(0, TITLE_MAX_LENGTH)
    : candidate;
}
