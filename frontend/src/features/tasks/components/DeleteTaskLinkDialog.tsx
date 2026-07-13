/**
 * DeleteTaskLinkDialog — confirmation dialog for removing a task link.
 *
 * Shows the linked task title and link type, then asks the user to confirm.
 * Cancel and ✕ dismiss without deleting. Escape key cancels as well.
 *
 * @param linkedTaskTitle - Title of the linked task (shown in the message).
 * @param linkType        - Link type string (shown in the message).
 * @param onConfirm       - Called when the user confirms deletion.
 * @param onCancel        - Called when the user cancels.
 * @param isDeleting      - True while the delete mutation is in flight.
 * @param errorMessage    - Error message shown when the delete call fails.
 */

import { useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";

interface DeleteTaskLinkDialogProps {
  linkedTaskTitle: string;
  linkType: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
  errorMessage?: string;
}

/** Modal confirmation dialog for task link removal. */
export function DeleteTaskLinkDialog({
  linkedTaskTitle,
  linkType,
  onConfirm,
  onCancel,
  isDeleting = false,
  errorMessage,
}: DeleteTaskLinkDialogProps) {
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
        aria-labelledby="delete-link-title"
        aria-describedby="delete-link-description"
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
              id="delete-link-title"
              className="text-base font-semibold text-text"
            >
              Remove link?
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded p-1 text-text-secondary hover:bg-surface-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50"
            aria-label="Cancel removal"
            title="Cancel removal"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Description */}
        <p
          id="delete-link-description"
          className="mb-4 text-sm text-text-secondary"
        >
          Remove the{" "}
          <span className="inline-block rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700 border border-brand-100">
            {linkType}
          </span>{" "}
          link to{" "}
          <span className="font-medium text-text">"{linkedTaskTitle}"</span>?
          This action cannot be undone.
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
            {isDeleting ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </>
  );
}
