/**
 * DeleteProjectDialog — confirmation dialog before permanently deleting a project.
 *
 * Makes the destructive consequence explicit: all nested data (stories, tasks,
 * attachments, comments, settings overrides) will be permanently removed.
 */

import { useEffect, useRef } from "react";
import type { Project } from "@/api/types";

interface DeleteProjectDialogProps {
  /** The project that is about to be deleted. */
  project: Project;
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
 * Modal confirmation step for project deletion.
 * Communicates that all nested data will be permanently removed.
 */
export function DeleteProjectDialog({
  project,
  onConfirm,
  onClose,
  isDeleting,
  errorMessage,
}: DeleteProjectDialogProps) {
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
      aria-labelledby="delete-project-title"
      aria-describedby="delete-project-description"
      className="m-auto w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl backdrop:bg-black/40"
    >
      <h2
        id="delete-project-title"
        className="mb-3 text-lg font-semibold text-text"
      >
        Delete project?
      </h2>

      <p id="delete-project-description" className="mb-2 text-sm text-text-secondary">
        You are about to permanently delete{" "}
        <strong className="text-text">{project.name}</strong>.
      </p>

      <p className="mb-5 rounded bg-status-error/10 px-3 py-2 text-sm text-status-error">
        This will permanently remove all nested data — stories, tasks, attachments,
        comments, and settings overrides. This action cannot be undone.
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
          {isDeleting ? "Deleting…" : "Delete permanently"}
        </button>
      </div>
    </dialog>
  );
}
