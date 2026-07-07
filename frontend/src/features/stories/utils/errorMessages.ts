/**
 * Shared error message utility for the Stories feature.
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
