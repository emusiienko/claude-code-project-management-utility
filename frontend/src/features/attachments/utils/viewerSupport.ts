/**
 * Determines how (or whether) the in-app viewer renders a stored-file
 * attachment, purely from its `mime_type` — the viewer never branches on
 * `kind`, since `text/plain` can occur under both `document` and `file`.
 */

export type ViewerRenderMode = "markdown" | "text" | "image" | "pdf" | "unsupported";

const IMAGE_MIME_PREFIX = "image/";

/**
 * Maps a stored file's MIME type to the viewer's render mode.
 * `"unsupported"` covers docx/xlsx/pptx/zip — those rows offer download only.
 */
export function getViewerRenderMode(mimeType: string): ViewerRenderMode {
  if (mimeType === "text/markdown") return "markdown";
  if (
    mimeType === "text/plain" ||
    mimeType === "text/csv" ||
    mimeType === "application/json"
  ) {
    return "text";
  }
  if (mimeType.startsWith(IMAGE_MIME_PREFIX)) return "image";
  if (mimeType === "application/pdf") return "pdf";
  return "unsupported";
}

/** Whether the row's "view" action (in-app viewer) should be shown for this MIME type. */
export function isViewableMimeType(mimeType: string | null): boolean {
  return mimeType !== null && getViewerRenderMode(mimeType) !== "unsupported";
}
