/**
 * DeleteCommentDialog — confirmation dialog for permanently removing a
 * comment. Mirrors `DeleteAttachmentDialog`'s contract.
 *
 * @param authorRole   - The comment's author role, shown in the confirmation message.
 * @param onConfirm    - Called when the user confirms deletion.
 * @param onCancel     - Called when the user cancels.
 * @param isDeleting   - True while the delete mutation is in flight.
 * @param errorMessage - Error message shown when the delete call fails.
 */

import { useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";

interface DeleteCommentDialogProps {
  authorRole: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
  errorMessage?: string;
}

/** Modal confirmation dialog for comment removal. */
export function DeleteCommentDialog({
  authorRole,
  onConfirm,
  onCancel,
  isDeleting = false,
  errorMessage,
}: DeleteCommentDialogProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isDeleting) onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel, isDeleting]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/50"
        aria-hidden="true"
        onClick={() => !isDeleting && onCancel()}
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-comment-title"
        aria-describedby="delete-comment-description"
        className="fixed left-1/2 top-1/2 z-[90] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="shrink-0 text-status-error" aria-hidden="true" />
            <h2 id="delete-comment-title" className="text-base font-semibold text-text">
              Delete comment?
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded p-1 text-text-secondary hover:bg-surface-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50"
            aria-label="Cancel deletion"
            title="Cancel deletion"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Description */}
        <p id="delete-comment-description" className="mb-4 text-sm text-text-secondary">
          Permanently delete this comment by{" "}
          <span className="font-medium text-text">{authorRole}</span>? This cannot be undone.
        </p>

        {/* Error */}
        {errorMessage && (
          <div role="alert" className="mb-4 rounded bg-status-error/10 px-3 py-2 text-sm text-status-error">
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-md border border-border px-4 py-1.5 text-sm text-text hover:bg-surface-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-md bg-status-error px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </>
  );
}
