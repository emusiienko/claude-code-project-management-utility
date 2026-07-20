/**
 * AddCommentForm — the pinned "Add Comment" form at the top of a
 * CommentsSection, above the newest-first thread.
 *
 * `author_role` pre-fills from the effective `default_web_ui_role` but stays
 * freely editable — once the user has typed into it, the pre-fill no longer
 * overwrites their input (it only overwrites while the field is untouched,
 * which also covers the case where the default itself is still loading when
 * the form first mounts).
 *
 * The parent remounts this component (via a changing `key`) after a
 * successful submit, which is what actually resets content/labels/author
 * role back to a fresh, re-prefilled state — this component owns no reset
 * logic itself.
 *
 * @param authorRoleDefault - The effective `default_web_ui_role`; used to pre-fill until the user edits the field.
 * @param participantRoles  - The project's effective `participant_roles` values, offered by the `@role` mention autocomplete inside the content field.
 * @param replyTarget       - When set, shows a dismissible "Replying to" chip; the compose form itself carries no reply-related field beyond `in_reply_to`.
 * @param onDismissReply    - Called when the user dismisses the reply chip.
 * @param onSubmit          - Called with the create input on submit.
 * @param isSubmitting      - True while the parent's create mutation is in flight.
 * @param errorMessage      - Top-level error message from a failed create attempt.
 * @param fieldErrors       - Per-field API error messages, keyed by field name.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { LabelsEditor } from "@/shared/components/LabelsEditor";
import { MentionTextarea } from "./MentionTextarea";
import type { Comment, CreateComment, Label } from "@/api/types";

interface AddCommentFormProps {
  authorRoleDefault: string;
  participantRoles: string[];
  replyTarget?: Comment;
  onDismissReply: () => void;
  onSubmit: (data: CreateComment) => void;
  isSubmitting?: boolean;
  errorMessage?: string;
  fieldErrors?: Record<string, string>;
}

const inputClass =
  "w-full rounded border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50";
const errorClass = "mt-0.5 text-xs text-status-error";

/** Compose form for creating a new comment (top-level or reply). */
export function AddCommentForm({
  authorRoleDefault,
  participantRoles,
  replyTarget,
  onDismissReply,
  onSubmit,
  isSubmitting = false,
  errorMessage,
  fieldErrors = {},
}: AddCommentFormProps) {
  const [authorRole, setAuthorRole] = useState(authorRoleDefault);
  const [authorRoleTouched, setAuthorRoleTouched] = useState(false);
  const [content, setContent] = useState("");
  const [labels, setLabels] = useState<Label[]>([]);

  // Keeps author_role in sync with the effective default until the user
  // edits it — covers the default still loading asynchronously on first mount.
  useEffect(() => {
    if (!authorRoleTouched) setAuthorRole(authorRoleDefault);
  }, [authorRoleDefault, authorRoleTouched]);

  const canSubmit = content.trim().length > 0 && authorRole.trim().length > 0 && !isSubmitting;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      content: content.trim(),
      author_role: authorRole.trim(),
      labels: labels.length > 0 ? labels : undefined,
      in_reply_to: replyTarget?.id,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Add comment"
      className="flex flex-col gap-3 rounded-md border border-border bg-surface-muted p-3"
    >
      {/* Dismissible reply chip */}
      {replyTarget && (
        <div className="flex items-center justify-between gap-2 rounded bg-brand-50 px-2.5 py-1.5 text-xs text-brand-700">
          <span>↩ Replying to {replyTarget.author_role}'s comment</span>
          <button
            type="button"
            onClick={onDismissReply}
            aria-label="Cancel reply"
            title="Cancel reply"
            className="rounded text-brand-700/70 hover:text-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Content */}
      <div>
        <label htmlFor="add-comment-content" className="mb-1 block text-xs font-medium text-text-secondary">
          Content (Markdown) <span aria-hidden="true" className="text-status-error">*</span>
        </label>
        <MentionTextarea
          id="add-comment-content"
          value={content}
          onChange={setContent}
          roles={participantRoles}
          required
          disabled={isSubmitting}
          rows={3}
          maxLength={50000}
          placeholder="Write a comment…"
          ariaDescribedBy={fieldErrors.content ? "add-comment-content-error" : undefined}
          className={`${inputClass} resize-y`}
        />
        {fieldErrors.content && (
          <p id="add-comment-content-error" role="alert" className={errorClass}>
            {fieldErrors.content}
          </p>
        )}
      </div>

      {/* Author role */}
      <div>
        <label htmlFor="add-comment-author-role" className="mb-1 block text-xs font-medium text-text-secondary">
          Author role <span aria-hidden="true" className="text-status-error">*</span>
        </label>
        <input
          id="add-comment-author-role"
          type="text"
          value={authorRole}
          onChange={(e) => {
            setAuthorRole(e.target.value);
            setAuthorRoleTouched(true);
          }}
          required
          disabled={isSubmitting}
          placeholder="e.g. operator"
          aria-describedby={fieldErrors.author_role ? "add-comment-author-role-error" : undefined}
          className={inputClass}
        />
        {fieldErrors.author_role && (
          <p id="add-comment-author-role-error" role="alert" className={errorClass}>
            {fieldErrors.author_role}
          </p>
        )}
      </div>

      {/* Labels */}
      <div>
        <span className="mb-1 block text-xs font-medium text-text-secondary">Labels</span>
        <LabelsEditor value={labels} onChange={setLabels} disabled={isSubmitting} />
      </div>

      {/* Top-level error */}
      {errorMessage && (
        <p role="alert" className="rounded bg-status-error/10 px-3 py-2 text-xs text-status-error">
          {errorMessage}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-brand-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Posting…" : "Add comment"}
        </button>
      </div>
    </form>
  );
}
