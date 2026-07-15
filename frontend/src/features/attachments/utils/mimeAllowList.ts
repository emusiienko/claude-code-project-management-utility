/**
 * Per-kind MIME allow-lists and upload limits — mirrors the backend's
 * `MIME_ALLOW_LIST_BY_KIND` (single source of truth: docs/api-contract.md v1.5).
 * Client-side checks here are a UX guard only; the server re-validates and is
 * the actual security boundary.
 */

export const DOCUMENT_MIME_TYPES = ["text/markdown", "text/plain"] as const;

export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

export const FILE_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
  "application/json",
  "application/zip",
] as const;

/** `accept` attribute for the "file" kind picker — extensions read more clearly than MIME types to users. */
export const FILE_KIND_ACCEPT =
  ".pdf,.docx,.xlsx,.pptx,.csv,.txt,.json,.zip," + FILE_MIME_TYPES.join(",");

/** `accept` attribute for the image kind picker. */
export const IMAGE_KIND_ACCEPT = IMAGE_MIME_TYPES.join(",");

/** `accept` attribute for the document-as-file picker. */
export const DOCUMENT_FILE_ACCEPT = ".md,.markdown,.txt," + DOCUMENT_MIME_TYPES.join(",");

/** Every stored-file kind shares the same 10 MB limit. */
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

/** Files at or above this size show an upload progress indicator. */
export const UPLOAD_PROGRESS_THRESHOLD_BYTES = 1 * 1024 * 1024;

/**
 * Detects a document's MIME type from its filename extension, since browsers
 * inconsistently populate `File.type` for `.md` files. Falls back to
 * `text/plain` for anything not recognized as Markdown.
 */
export function detectDocumentMimeType(fileName: string): "text/markdown" | "text/plain" {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown")
    ? "text/markdown"
    : "text/plain";
}

/** Extension -> MIME fallback for browsers that report an empty `File.type`. */
const EXTENSION_MIME_FALLBACK: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".json": "application/json",
  ".zip": "application/zip",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/**
 * Resolves the MIME type to submit for an image or file-kind upload.
 * Prefers the browser-reported `File.type`; falls back to an extension guess
 * when the browser leaves it blank (common for some binary types on some OSes).
 */
export function resolveBinaryMimeType(file: File): string {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  const match = Object.entries(EXTENSION_MIME_FALLBACK).find(([ext]) =>
    lower.endsWith(ext),
  );
  return match ? match[1] : "application/octet-stream";
}
