/**
 * CommentRow — a single comment entry in a CommentsSection thread.
 *
 * Read mode shows the author role, a "↩ Replying to {author_role}" prefix
 * when the comment is a reply (derived from `ancestors[ancestors.length -
 * 1]`, resolved against the already-loaded thread), the content rendered as
 * Markdown, label chips, a timestamp, and inline Edit/Reply/Delete/Copy-link
 * actions. Edit mode swaps the row for `EditCommentForm`.
 *
 * The thread stays flat — this row never renders nested/indented replies;
 * the reply-prefix is only a header line on an otherwise ordinary comment.
 *
 * Any `/comments/:id` link inside the rendered content (root-relative or
 * absolute to this app's own origin) navigates via client-side routing
 * instead of a full page reload (TASK-009's `CommentMarkdownLink`).
 *
 * @param comment          - The comment to render.
 * @param parentAuthorRole - The direct parent's author role, when the parent is loaded in the current thread; undefined otherwise.
 * @param canJumpToParent  - True when the parent comment is present in the loaded thread and can be scrolled to.
 * @param isHighlighted    - True while this row is the target of a just-completed jump — renders a momentary accent background.
 * @param isEditing        - True while this row is in inline edit mode.
 * @param isUpdating       - True while the parent's update mutation is in flight for this row.
 * @param updateError      - Top-level error from a failed update attempt.
 * @param updateFieldErrors - Per-field error messages from a failed update attempt.
 * @param registerRef      - Registers this row's DOM element for the reply-jump scroll mechanism.
 * @param participantRoles - The project's effective `participant_roles` values — drives both
 *                            `@role` mention highlighting on this row's rendered content and the
 *                            mention autocomplete inside its inline edit form.
 * @param onStartEdit       - Called when the user clicks Edit.
 * @param onCancelEdit      - Called when the user cancels the inline edit.
 * @param onSaveEdit        - Called with the updated content/labels on save.
 * @param onReply           - Called when the user clicks Reply.
 * @param onDelete           - Called when the user clicks Delete.
 * @param onCopyLink         - Called when the user clicks Copy link.
 * @param onJumpToParent     - Called when the user clicks the reply-prefix jump link.
 */

import { Pencil, Reply, Trash2, Link2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { IconButton } from "@/shared/components/IconButton";
import { formatTimestamp } from "@/shared/utils/formatTimestamp";
import { MARKDOWN_CONTENT_CLASS } from "@/shared/utils/markdownStyles";
import { createMentionRehypePlugin } from "@/features/comments/utils/mentionRehypePlugin";
import { EditCommentForm } from "./EditCommentForm";
import { MentionMarkdownSpan } from "./MentionMarkdownSpan";
import { CommentMarkdownLink } from "./CommentMarkdownLink";
import type { Comment, UpdateComment } from "@/api/types";

/** `react-markdown` element overrides shared by every rendered comment. */
const MARKDOWN_COMPONENTS = { span: MentionMarkdownSpan, a: CommentMarkdownLink };

interface CommentRowProps {
  comment: Comment;
  parentAuthorRole?: string;
  canJumpToParent: boolean;
  isHighlighted: boolean;
  isEditing: boolean;
  isUpdating?: boolean;
  updateError?: string;
  updateFieldErrors?: Record<string, string>;
  registerRef: (el: HTMLLIElement | null) => void;
  participantRoles: string[];
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (data: UpdateComment) => void;
  onReply: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  onJumpToParent: () => void;
}

/** Single comment row, switching between a read view and an inline edit form. */
export function CommentRow({
  comment,
  parentAuthorRole,
  canJumpToParent,
  isHighlighted,
  isEditing,
  isUpdating = false,
  updateError,
  updateFieldErrors,
  registerRef,
  participantRoles,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onReply,
  onDelete,
  onCopyLink,
  onJumpToParent,
}: CommentRowProps) {
  const isReply = comment.ancestors.length > 0;

  return (
    <li
      ref={registerRef}
      className={`flex flex-col gap-1.5 px-3 py-2.5 transition-colors duration-1000 ${
        isHighlighted ? "bg-brand-50" : ""
      }`}
    >
      {isEditing ? (
        <EditCommentForm
          initialContent={comment.content}
          initialLabels={comment.labels}
          authorRole={comment.author_role}
          participantRoles={participantRoles}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          isSaving={isUpdating}
          errorMessage={updateError}
          fieldErrors={updateFieldErrors}
        />
      ) : (
        <>
          {/* Reply-prefix line */}
          {isReply &&
            (canJumpToParent ? (
              <button
                type="button"
                onClick={onJumpToParent}
                className="self-start rounded text-xs text-brand-600 hover:underline focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                ↩ Replying to {parentAuthorRole}
              </button>
            ) : (
              <p className="text-xs italic text-text-muted">↩ Replying to a comment</p>
            ))}

          {/* Author + timestamp */}
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-sm font-medium text-text">{comment.author_role}</span>
            <span className="text-[11px] text-text-muted">{formatTimestamp(comment.created_at)}</span>
          </div>

          {/* Markdown content — `@role` tokens matching a current effective role render as accent badges */}
          <div className={MARKDOWN_CONTENT_CLASS}>
            <ReactMarkdown
              rehypePlugins={[createMentionRehypePlugin(participantRoles)]}
              components={MARKDOWN_COMPONENTS}
            >
              {comment.content}
            </ReactMarkdown>
          </div>

          {/* Label chips */}
          {comment.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {comment.labels.map((label, idx) => (
                <span
                  key={`${label.key}-${idx}`}
                  className="inline-block rounded bg-surface-muted px-1.5 py-0.5 text-xs text-text-secondary"
                >
                  <span className="font-medium text-text">{label.key}</span>
                  {label.value && (
                    <>
                      <span className="text-text-muted">:</span> <span>{label.value}</span>
                    </>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 pt-0.5">
            <IconButton Icon={Pencil} label={`Edit comment by ${comment.author_role}`} onClick={onStartEdit} />
            <IconButton Icon={Reply} label={`Reply to comment by ${comment.author_role}`} onClick={onReply} />
            <IconButton Icon={Link2} label={`Copy link to comment by ${comment.author_role}`} onClick={onCopyLink} />
            <IconButton
              Icon={Trash2}
              label={`Delete comment by ${comment.author_role}`}
              intent="destructive"
              onClick={onDelete}
            />
          </div>
        </>
      )}
    </li>
  );
}
