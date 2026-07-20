/**
 * Comment permalink resolver — the feature entry mounted at `/comments/:id`.
 *
 * Fetches the comment by id, resolves its owning story/task/milestone host
 * view (`useCommentHostRoute`), and navigates there once — passing
 * `scrollToCommentId` in router state so the destination's `CommentsSection`
 * scrolls to and briefly highlights the comment via its existing jump
 * mechanism. Shared by the standalone Copy-link permalink and any internal
 * `/comments/:id` link rendered inside comment content (`CommentMarkdownLink`).
 *
 * A comment that no longer exists (deleted, hard-removed — there is no
 * archive/tombstone in this app) cannot be resolved to any host: the record
 * and its container reference are gone together. That is shown as a calm,
 * non-error "no longer available" state rather than an error — consistent
 * with the same graceful-degradation behavior the reply-prefix jump link
 * already applies to a deleted ancestor within a loaded thread.
 */

import { useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ApiRequestError } from "@/core/client";
import { useComment } from "@/features/comments/hooks/useComments";
import { useCommentHostRoute } from "@/features/comments/hooks/useCommentHostRoute";
import { PageLoader } from "@/shared/components/PageLoader";

/** Comment permalink resolver page. Route: /comments/:id. */
export default function CommentPermalinkPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: comment, isError: isCommentError, error: commentError } = useComment(id);
  const { path, isError: isHostError } = useCommentHostRoute(comment);

  const isNotFound =
    isCommentError && commentError instanceof ApiRequestError && commentError.status === 404;
  const isUnexpectedError = (isCommentError && !isNotFound) || isHostError;

  // Navigate exactly once, as soon as the host path is known.
  useEffect(() => {
    if (!path) return;
    navigate(path, { replace: true, state: { scrollToCommentId: id } });
  }, [path, id, navigate]);

  if (isUnexpectedError) {
    return (
      <div
        role="alert"
        className="flex min-h-64 flex-col items-center justify-center gap-2 p-8 text-center"
      >
        <p className="text-sm font-medium text-status-error">Failed to open this comment.</p>
        <p className="text-xs text-text-muted">Please try again, or check the link.</p>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div
        role="status"
        className="flex min-h-64 flex-col items-center justify-center gap-2 p-8 text-center"
      >
        <p className="text-sm font-medium text-text-secondary">This comment is no longer available.</p>
        <p className="text-xs text-text-muted">It may have been deleted since this link was shared.</p>
        <Link
          to="/"
          className="mt-2 rounded-md border border-border px-4 py-2 text-sm text-text hover:bg-surface-muted"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  // Loading the comment, resolving its host, or waiting for the navigate above to take effect.
  return <PageLoader />;
}
