/**
 * StoryModal — modal dialog for creating or editing a story.
 *
 * Wraps StoryForm in a <dialog> element with accessible focus trapping
 * and keyboard dismissal (Escape). Delegates mutation logic to the parent.
 * Status options are sourced from the project's effective story_statuses.
 */

import { useEffect, useRef } from "react";
import { StoryForm, type StoryFormValues } from "./StoryForm";
import type { Story } from "@/api/types";

interface StoryModalProps {
  /** The story to edit. When undefined, the modal is in "create" mode. */
  story?: Story;
  /** Allowed status values from the project's effective story_statuses dict. */
  statusOptions: string[];
  /** Called when the form is submitted. */
  onSubmit: (values: StoryFormValues) => void;
  /** Called when the modal is dismissed (Cancel or Escape). */
  onClose: () => void;
  /** Whether the form submission is in-flight. */
  isSubmitting: boolean;
  /** Inline error to display in the form (e.g. 422 status validation). */
  errorMessage?: string;
}

/**
 * Accessible modal wrapping the StoryForm for create and edit workflows.
 * Uses the native <dialog> element for built-in keyboard and focus semantics.
 */
export function StoryModal({
  story,
  statusOptions,
  onSubmit,
  onClose,
  isSubmitting,
  errorMessage,
}: StoryModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isEditMode = Boolean(story);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function handleDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    // Close when clicking the backdrop (the <dialog> element itself, not its content)
    if (e.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleDialogClick}
      aria-labelledby="story-modal-title"
      className="m-auto w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-xl backdrop:bg-black/40"
    >
      <h2
        id="story-modal-title"
        className="mb-5 text-lg font-semibold text-text"
      >
        {isEditMode ? "Edit story" : "New story"}
      </h2>

      <StoryForm
        initialValues={
          story
            ? {
                title: story.title,
                content: story.content ?? "",
                status: story.status ?? "",
                labels: story.labels,
              }
            : undefined
        }
        statusOptions={statusOptions}
        onSubmit={onSubmit}
        onCancel={onClose}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        submitLabel={isEditMode ? "Update" : "Create"}
      />
    </dialog>
  );
}
