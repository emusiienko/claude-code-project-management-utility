/**
 * MilestoneModal — modal dialog for creating or editing a milestone.
 *
 * Wraps MilestoneForm in a native <dialog> element with accessible focus
 * trapping and keyboard dismissal (Escape). Delegates mutation logic to the parent.
 */

import { useEffect, useRef } from "react";
import { MilestoneForm, type MilestoneFormValues } from "./MilestoneForm";
import type { Milestone } from "@/api/types";

interface MilestoneModalProps {
  /** The milestone to edit. When undefined the modal is in "create" mode. */
  milestone?: Milestone;
  /** Called when the form is submitted. */
  onSubmit: (values: MilestoneFormValues) => void;
  /** Called when the modal is dismissed (Cancel or Escape). */
  onClose: () => void;
  /** Whether the form submission is in-flight. */
  isSubmitting: boolean;
  /** Inline error to display in the form (e.g. 409 conflict message). */
  errorMessage?: string;
}

/**
 * Accessible modal wrapping the MilestoneForm for create and edit workflows.
 * Uses the native <dialog> element for built-in keyboard and focus semantics.
 */
export function MilestoneModal({
  milestone,
  onSubmit,
  onClose,
  isSubmitting,
  errorMessage,
}: MilestoneModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isEditMode = Boolean(milestone);

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
      aria-labelledby="milestone-modal-title"
      className="m-auto w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl backdrop:bg-black/40"
    >
      <h2
        id="milestone-modal-title"
        className="mb-5 text-lg font-semibold text-text"
      >
        {isEditMode ? "Edit milestone" : "New milestone"}
      </h2>

      <MilestoneForm
        initialValues={
          milestone
            ? { name: milestone.name, description: milestone.description ?? "" }
            : undefined
        }
        onSubmit={onSubmit}
        onCancel={onClose}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        submitLabel={isEditMode ? "Update" : "Create"}
      />
    </dialog>
  );
}
