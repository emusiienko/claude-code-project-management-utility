/**
 * DeleteStoryDialog — confirmation dialog before permanently deleting a story.
 *
 * Makes the destructive consequence explicit. Tasks, attachments, and comments
 * will also be removed when tasks are introduced in STORY-005.
 */

import { useEffect, useRef } from "react";
import type { Story } from "@/api/types";

interface DeleteStoryDialogProps {
  /** The story that is about to be deleted. */
  story: Story;
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
 * Modal confirmation step for story deletion.
 */
export function DeleteStoryDialog({
  story,
  onConfirm,
  onClose,
  isDeleting,
  errorMessage,
}: DeleteStoryDialogProps) {
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
      aria-labelledby="delete-story-title"
      aria-describedby="delete-story-description"
      className="m-auto w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl backdrop:bg-black/40"
    >
      <h2
        id="delete-story-title"
        className="mb-3 text-lg font-semibold text-text"
      >
        Delete story?
      </h2>

      <p id="delete-story-description" className="mb-2 text-sm text-text-secondary">
        You are about to permanently delete{" "}
        <strong className="text-text">{story.title}</strong>.
      </p>

      <p className="mb-5 rounded bg-status-error/10 px-3 py-2 text-sm text-status-error">
        This action cannot be undone.
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
