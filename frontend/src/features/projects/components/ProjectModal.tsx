/**
 * ProjectModal — modal dialog for creating or editing a project.
 *
 * Wraps ProjectForm in a <dialog> element with accessible focus trapping
 * and keyboard dismissal (Escape). Delegates mutation logic to the parent.
 */

import { useEffect, useRef } from "react";
import { ProjectForm, type ProjectFormValues } from "./ProjectForm";
import type { Project } from "@/api/types";

interface ProjectModalProps {
  /** The project to edit. When undefined, the modal is in "create" mode. */
  project?: Project;
  /** Called when the form is submitted. */
  onSubmit: (values: ProjectFormValues) => void;
  /** Called when the modal is dismissed (Cancel or Escape). */
  onClose: () => void;
  /** Whether the form submission is in-flight. */
  isSubmitting: boolean;
  /** Inline error to display in the form (e.g. 409 conflict message). */
  errorMessage?: string;
}

/**
 * Accessible modal wrapping the ProjectForm for create and edit workflows.
 * Uses the native <dialog> element for built-in keyboard and focus semantics.
 */
export function ProjectModal({
  project,
  onSubmit,
  onClose,
  isSubmitting,
  errorMessage,
}: ProjectModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isEditMode = Boolean(project);

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
      aria-labelledby="project-modal-title"
      className="m-auto w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl backdrop:bg-black/40"
    >
      <h2
        id="project-modal-title"
        className="mb-5 text-lg font-semibold text-text"
      >
        {isEditMode ? "Edit project" : "New project"}
      </h2>

      <ProjectForm
        initialValues={
          project
            ? { name: project.name, description: project.description ?? "" }
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
