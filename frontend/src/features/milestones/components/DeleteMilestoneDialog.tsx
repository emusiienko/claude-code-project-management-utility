/**
 * DeleteMilestoneDialog — confirmation dialog before deleting a milestone.
 *
 * Makes the consequence explicit: stories that had this milestone assigned
 * will lose their assignment (milestone_id set to null), but stories are
 * not deleted.
 */

import { useEffect, useRef } from "react";
import type { Milestone } from "@/api/types";

interface DeleteMilestoneDialogProps {
  /** The milestone that is about to be deleted. */
  milestone: Milestone;
  /** Called when the user confirms deletion. */
  onConfirm: () => void;
  /** Called when the user cancels or dismisses the dialog. */
  onClose: () => void;
  /** Whether the delete mutation is in-flight. */
  isDeleting: boolean;
  /** API error message to display if the delete fails. */
  errorMessage?: string;
}

/**
 * Modal confirmation step for milestone deletion.
 * Communicates that assigned stories lose their milestone assignment but
 * are not deleted.
 */
export function DeleteMilestoneDialog({
  milestone,
  onConfirm,
  onClose,
  isDeleting,
  errorMessage,
}: DeleteMilestoneDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function handleDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleDialogClick}
      aria-labelledby="delete-milestone-title"
      aria-describedby="delete-milestone-description"
      className="m-auto w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl backdrop:bg-black/40"
    >
      <h2
        id="delete-milestone-title"
        className="mb-3 text-lg font-semibold text-text"
      >
        Delete milestone?
      </h2>

      <p id="delete-milestone-description" className="mb-2 text-sm text-text-secondary">
        You are about to delete{" "}
        <strong className="text-text">{milestone.name}</strong>.
      </p>

      <p className="mb-5 rounded bg-status-error/10 px-3 py-2 text-sm text-status-error">
        Stories assigned to this milestone will lose their assignment (milestone set to none),
        but the stories themselves will not be deleted.
      </p>

      {errorMessage && (
        <p role="alert" className="mb-4 rounded bg-status-error/10 px-3 py-2 text-sm text-status-error">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="rounded-md border border-border px-4 py-2 text-sm text-text hover:bg-surface-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          className="rounded-md bg-status-error px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isDeleting ? "Deleting…" : "Delete milestone"}
        </button>
      </div>
    </dialog>
  );
}
