/**
 * Comment permalink helper.
 *
 * The backend contract is root-relative (`/comments/{id}`) so it stays
 * origin-agnostic; the Web UI turns it absolute only when copying to the
 * clipboard. The `/comments/:id` resolver route itself is added in TASK-009.
 */

/** Builds the absolute, shareable permalink URL for a comment. */
export function getCommentPermalink(commentId: string): string {
  return `${window.location.origin}/comments/${commentId}`;
}
