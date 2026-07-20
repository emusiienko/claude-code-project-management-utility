/**
 * EditCommentForm — inline edit form for a single comment's `content` and
 * `labels`. `author_role` is displayed read-only since it is immutable after
 * creation.
 *
 * Mounted only while the parent comment row is in edit mode, so its local
 * state is always freshly seeded from the comment being edited (no reset
 * effect needed — mounting is the reset).
 *
 * @param initialContent - The comment's current content, used as the starting value.
 * @param initialLabels  - The comment's current labels, used as the starting value.
 * @param authorRole     - Read-only display of the comment's immutable author role.
 * @param onSave         - Called with the updated content/labels on submit.
 * @param onCancel       - Called when the user cancels the edit.
 * @param isSaving       - True while the parent's update mutation is in flight.
 * @param errorMessage   - Top-level error message from a failed save attempt.
 * @param fieldErrors    - Per-field API error messages, keyed by field name.
 */

import { useState } from "react";
import { LabelsEditor } from "@/shared/components/LabelsEditor";
import type { Label, UpdateComment } from "@/api/types";

interface EditCommentFormProps {
  initialContent: string;
  initialLabels: Label[];
  authorRole: string;
  onSave: (data: UpdateComment) => void;
  onCancel: () => void;
  isSaving?: boolean;
  errorMessage?: string;
  fieldErrors?: Record<string, string>;
}

const textareaClass =
  "w-full rounded border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50 resize-y";
const errorClass = "mt-0.5 text-xs text-status-error";

/** Inline content + labels editor for an existing comment, in place of the read view. */
export function EditCommentForm({
  initialContent,
  initialLabels,
  authorRole,
  onSave,
  onCancel,
  isSaving = false,
  errorMessage,
  fieldErrors = {},
}: EditCommentFormProps) {
  const [content, setContent] = useState(initialContent);
  const [labels, setLabels] = useState<Label[]>(initialLabels);

  const canSave = content.trim().length > 0 && !isSaving;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    onSave({ content: content.trim(), labels });
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Edit comment" className="flex flex-col gap-3">
      {/* Author role — read-only, immutable */}
      <div>
        <span className="mb-0.5 block text-xs font-medium text-text-secondary">Author role</span>
        <p className="text-sm text-text">{authorRole}</p>
      </div>

      {/* Content */}
      <div>
        <label htmlFor="edit-comment-content" className="mb-1 block text-xs font-medium text-text-secondary">
          Content (Markdown) <span aria-hidden="true" className="text-status-error">*</span>
        </label>
        <textarea
          id="edit-comment-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          disabled={isSaving}
          rows={4}
          maxLength={50000}
          aria-describedby={fieldErrors.content ? "edit-comment-content-error" : undefined}
          className={textareaClass}
        />
        {fieldErrors.content && (
          <p id="edit-comment-content-error" role="alert" className={errorClass}>
            {fieldErrors.content}
          </p>
        )}
      </div>

      {/* Labels */}
      <div>
        <span className="mb-1 block text-xs font-medium text-text-secondary">Labels</span>
        <LabelsEditor value={labels} onChange={setLabels} disabled={isSaving} />
      </div>

      {/* Top-level error */}
      {errorMessage && (
        <p role="alert" className="rounded bg-status-error/10 px-3 py-2 text-xs text-status-error">
          {errorMessage}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text hover:bg-surface-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
