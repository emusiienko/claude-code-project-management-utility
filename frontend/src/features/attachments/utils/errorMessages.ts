/**
 * Error message utility for the Attachments feature.
 */

import { ApiRequestError } from "@/core/client";

/**
 * Extracts a user-readable message from an unknown thrown value.
 * Only exposes the server's human-readable `error` field — never raw internals.
 */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.body.error;
  return "An unexpected error occurred. Please try again.";
}

/**
 * Extracts per-field error messages from an API validation error.
 * Returns an empty object when the error has no field-level details.
 */
export function extractFieldErrors(err: unknown): Record<string, string> {
  if (err instanceof ApiRequestError) {
    const details = err.body.details;
    if (!details) return {};
    return Object.fromEntries(details.map((d) => [d.field, d.message]));
  }
  return {};
}
