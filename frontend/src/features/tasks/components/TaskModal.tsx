/**
 * TaskModal — modal dialog for creating or editing a task.
 *
 * Wraps TaskForm in a modal overlay. The title changes between
 * "New task" (create) and "Edit task" (edit) depending on whether
 * an initial task is provided.
 *
 * @param task           - Task to edit; undefined means create mode.
 * @param lockedStatus   - Pre-filled read-only status (used when creating from a column footer).
 * @param typeOptions    - Values from the project's effective task_types.
 * @param statusOptions  - Values from the project's effective task_statuses.
 * @param roleOptions    - Values from the project's effective participant_roles.
 * @param onSubmit       - Called with form values when the user saves.
 * @param onClose        - Called when the modal is dismissed.
 * @param isSubmitting   - True while the parent mutation is in flight.
 * @param errorMessage   - Top-level error shown when the API returns a non-field error.
 */

import { useEffect } from "react";
import { X } from "lucide-react";
import { TaskForm } from "./TaskForm";
import type { Task, CreateTask } from "@/api/types";

interface TaskModalProps {
  /** Existing task when editing; undefined when creating. */
  task?: Task;
  /** Pre-filled read-only status for the create path (from a column footer). */
  lockedStatus?: string;
  /** Values from the project's effective task_types dictionary. */
  typeOptions: string[];
  /** Values from the project's effective task_statuses dictionary. */
  statusOptions: string[];
  /** Values from the project's effective participant_roles dictionary. */
  roleOptions: string[];
  /** Per-field API error messages. */
  fieldErrors?: Record<string, string>;
  /** Called with form values when the user submits. */
  onSubmit: (values: CreateTask) => void;
  /** Called when the user closes the modal (Cancel or ✕). */
  onClose: () => void;
  /** True while the parent mutation is in flight. */
  isSubmitting?: boolean;
  /** Top-level non-field error message from the API. */
  errorMessage?: string;
}

/**
 * Modal overlay for creating or editing a task.
 * Traps focus within the dialog; Escape closes it.
 */
export function TaskModal({
  task,
  lockedStatus,
  typeOptions,
  statusOptions,
  roleOptions,
  fieldErrors,
  onSubmit,
  onClose,
  isSubmitting,
  errorMessage,
}: TaskModalProps) {
  const isEdit = task !== undefined;
  const title = isEdit ? "Edit task" : "New task";

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, isSubmitting]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50"
        aria-hidden="true"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className="fixed left-1/2 top-1/2 z-[70] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="task-modal-title"
            className="text-base font-semibold text-text"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded p-1.5 text-text-secondary hover:bg-surface-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50"
            aria-label="Close task dialog"
            title="Close task dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Top-level error */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded bg-status-error/10 px-3 py-2 text-sm text-status-error"
          >
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <div className="max-h-[70vh] overflow-y-auto">
          <TaskForm
            initialValues={
              task
                ? {
                    title: task.title,
                    type: task.type,
                    status: task.status,
                    content: task.content ?? "",
                    assignee_role: task.assignee_role ?? "",
                    creator_role: task.creator_role ?? "",
                    labels: task.labels,
                  }
                : undefined
            }
            lockedStatus={lockedStatus}
            typeOptions={typeOptions}
            statusOptions={statusOptions}
            roleOptions={roleOptions}
            fieldErrors={fieldErrors}
            onSubmit={onSubmit}
            onCancel={onClose}
            isSubmitting={isSubmitting}
            submitLabel={isEdit ? "Save changes" : "Create task"}
          />
        </div>
      </div>
    </>
  );
}
