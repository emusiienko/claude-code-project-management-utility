/**
 * DeleteAttachmentDialog — confirmation dialog for permanently removing an
 * attachment. Works for every kind (document/image/file/external-ref); for
 * document/image/file the stored file is removed from disk as well.
 *
 * @param attachmentName - Display name shown in the confirmation message.
 * @param onConfirm      - Called when the user confirms deletion.
 * @param onCancel       - Called when the user cancels.
 * @param isDeleting     - True while the delete mutation is in flight.
 * @param errorMessage   - Error message shown when the delete call fails.
 */

import { useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";

interface DeleteAttachmentDialogProps {
  attachmentName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
  errorMessage?: string;
}

/** Modal confirmation dialog for attachment removal. */
export function DeleteAttachmentDialog({
  attachmentName,
  onConfirm,
  onCancel,
  isDeleting = false,
  errorMessage,
}: DeleteAttachmentDialogProps) {
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
        aria-labelledby="delete-attachment-title"
        aria-describedby="delete-attachment-description"
        className="fixed left-1/2 top-1/2 z-[90] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle
              size={20}
              className="shrink-0 text-status-error"
              aria-hidden="true"
            />
            <h2
              id="delete-attachment-title"
              className="text-base font-semibold text-text"
            >
              Delete attachment?
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
        <p
          id="delete-attachment-description"
          className="mb-4 text-sm text-text-secondary"
        >
          Permanently delete{" "}
          <span className="font-medium text-text">"{attachmentName}"</span>?
          This removes the stored file, if any, and cannot be undone.
        </p>

        {/* Error */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded bg-status-error/10 px-3 py-2 text-sm text-status-error"
          >
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
