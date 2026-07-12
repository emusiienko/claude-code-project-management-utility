/**
 * Unit tests for the Tasks error-message utility — STORY-005 (TASK-007 reconcile).
 *
 * Coverage:
 * - extractErrorMessage: returns server's human-readable error for ApiRequestError,
 *   returns generic message for unknown errors
 * - extractFieldErrors: returns per-field map when details present,
 *   returns empty object when no details, returns empty object for unknown errors
 */

import { describe, it, expect } from "vitest";
import { extractErrorMessage, extractFieldErrors } from "./errorMessages";
import { ApiRequestError } from "@/core/client";

// ---------------------------------------------------------------------------
// Helpers to construct ApiRequestError instances
// ---------------------------------------------------------------------------

function makeApiError(
  error: string,
  details?: Array<{ field: string; message: string }>,
): ApiRequestError {
  return new ApiRequestError(422, {
    code: "UNPROCESSABLE",
    error,
    ...(details !== undefined ? { details } : {}),
  });
}

// ---------------------------------------------------------------------------
// extractErrorMessage
// ---------------------------------------------------------------------------

describe("extractErrorMessage", () => {
  it("returns the server error string for an ApiRequestError", () => {
    const err = makeApiError("Title is required");
    expect(extractErrorMessage(err)).toBe("Title is required");
  });

  it("returns a generic fallback message for a plain Error", () => {
    const err = new Error("something went wrong");
    expect(extractErrorMessage(err)).toBe(
      "An unexpected error occurred. Please try again.",
    );
  });

  it("returns a generic fallback message for null", () => {
    expect(extractErrorMessage(null)).toBe(
      "An unexpected error occurred. Please try again.",
    );
  });

  it("returns a generic fallback message for undefined", () => {
    expect(extractErrorMessage(undefined)).toBe(
      "An unexpected error occurred. Please try again.",
    );
  });

  it("returns a generic fallback message for a plain string throw", () => {
    expect(extractErrorMessage("raw string error")).toBe(
      "An unexpected error occurred. Please try again.",
    );
  });
});

// ---------------------------------------------------------------------------
// extractFieldErrors
// ---------------------------------------------------------------------------

describe("extractFieldErrors", () => {
  it("returns a field → message map when details are present", () => {
    const err = makeApiError("Validation failed", [
      { field: "title", message: "Title is required" },
      { field: "type", message: "Invalid type" },
    ]);
    expect(extractFieldErrors(err)).toEqual({
      title: "Title is required",
      type: "Invalid type",
    });
  });

  it("returns an empty object when the error has no details (null)", () => {
    const err = makeApiError("Something went wrong");
    expect(extractFieldErrors(err)).toEqual({});
  });

  it("returns an empty object for a plain Error (non-ApiRequestError)", () => {
    const err = new Error("unexpected");
    expect(extractFieldErrors(err)).toEqual({});
  });

  it("returns an empty object for null", () => {
    expect(extractFieldErrors(null)).toEqual({});
  });

  it("maps each detail entry independently", () => {
    const err = makeApiError("Multiple errors", [
      { field: "assignee_role", message: "Not a valid role" },
      { field: "creator_role", message: "Not a valid role" },
    ]);
    const result = extractFieldErrors(err);
    expect(result).toHaveProperty("assignee_role", "Not a valid role");
    expect(result).toHaveProperty("creator_role", "Not a valid role");
    expect(Object.keys(result)).toHaveLength(2);
  });
});
