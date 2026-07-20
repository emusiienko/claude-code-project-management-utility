/**
 * Comment permalink helpers.
 *
 * The backend contract is root-relative (`/comments/{id}`) so it stays
 * origin-agnostic; the Web UI turns it absolute only when copying to the
 * clipboard. The `/comments/:id` resolver route (TASK-009) fetches the
 * comment, resolves its host view, and navigates there with a scroll +
 * highlight request.
 */

const COMMENT_PATH_PATTERN = /^\/comments\/([^/?#]+)/;

/** Builds the absolute, shareable permalink URL for a comment. */
export function getCommentPermalink(commentId: string): string {
  return `${window.location.origin}/comments/${commentId}`;
}

/**
 * Extracts the comment id from an internal permalink, whether written
 * root-relative (as the backend contract specifies) or absolute to this
 * app's own origin (as `getCommentPermalink` produces for Copy link).
 * Returns `undefined` for any other link — those are left to the browser's
 * default anchor behavior.
 */
export function parseCommentPermalinkId(href: string): string | undefined {
  let url: URL;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    return undefined;
  }
  if (url.origin !== window.location.origin) return undefined;
  return COMMENT_PATH_PATTERN.exec(url.pathname)?.[1];
}
