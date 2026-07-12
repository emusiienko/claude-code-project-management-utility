/**
 * TaskForm — cohesive create/edit form for a Task.
 *
 * Fields:
 *   - title (required, 1–500 chars)
 *   - type (required, from task_types dictionary)
 *   - status (required, from task_statuses dictionary; read-only when locked)
 *   - content (optional, Markdown textarea)
 *   - assignee_role (optional, from participant_roles)
 *   - creator_role (optional, from participant_roles)
 *   - labels (optional, via LabelsEditor)
 *
 * Submit is disabled until title, type, and status are all filled.
 * API validation errors are displayed inline next to the relevant field.
 *
 * @param initialValues  - Pre-filled values when editing an existing task.
 * @param lockedStatus   - When provided, the status field is pre-filled and read-only.
 * @param typeOptions    - Values from the project's effective task_types.
 * @param statusOptions  - Values from the project's effective task_statuses.
 * @param roleOptions    - Values from the project's effective participant_roles.
 * @param fieldErrors    - Per-field error messages from the API.
 * @param onSubmit       - Called with form values when the user submits.
 * @param onCancel       - Called when the user cancels.
 * @param isSubmitting   - True while the parent mutation is in flight.
 * @param submitLabel    - Label for the submit button (defaults to "Save").
 */

import { useState } from "react";
import { LabelsEditor } from "@/shared/components/LabelsEditor";
import type { CreateTask, Label } from "@/api/types";

export interface TaskFormValues {
  title: string;
  type: string;
  status: string;
  content: string;
  assignee_role: string;
  creator_role: string;
  labels: Label[];
}

interface TaskFormProps {
  /** Initial field values — used when editing an existing task. */
  initialValues?: Partial<TaskFormValues>;
  /**
   * When provided, the status field is pre-filled with this value and is read-only.
   * Used when opening the form from a column's "Add task" footer.
   */
  lockedStatus?: string;
  /** Values from the project's effective task_types dictionary. */
  typeOptions: string[];
  /** Values from the project's effective task_statuses dictionary. */
  statusOptions: string[];
  /** Values from the project's effective participant_roles dictionary. */
  roleOptions: string[];
  /** Per-field API error messages — keyed by field name. */
  fieldErrors?: Record<string, string>;
  /** Called with form values when the user submits. */
  onSubmit: (values: CreateTask) => void;
  /** Called when the user presses Cancel. */
  onCancel: () => void;
  /** True while the parent mutation is in flight — disables inputs. */
  isSubmitting?: boolean;
  /** Label for the primary submit button. Defaults to "Save". */
  submitLabel?: string;
}

const inputClass =
  "w-full rounded border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50";

const selectClass =
  "w-full rounded border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50";

const errorClass = "mt-0.5 text-xs text-status-error";

/**
 * Controlled create/edit form for a Task entity.
 * All state is owned internally; the parent receives values only on submit.
 */
export function TaskForm({
  initialValues,
  lockedStatus,
  typeOptions,
  statusOptions,
  roleOptions,
  fieldErrors = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Save",
}: TaskFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [type, setType] = useState(initialValues?.type ?? typeOptions[0] ?? "");
  const [status, setStatus] = useState(
    lockedStatus ?? initialValues?.status ?? statusOptions[0] ?? "",
  );
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [assigneeRole, setAssigneeRole] = useState(
    initialValues?.assignee_role ?? "",
  );
  const [creatorRole, setCreatorRole] = useState(
    initialValues?.creator_role ?? "",
  );
  const [labels, setLabels] = useState<Label[]>(initialValues?.labels ?? []);

  // Derived each render so the button state is always in sync with the current inputs.
  const titleValid = title.trim().length > 0 && title.trim().length <= 500;
  const canSubmit = titleValid && type.trim().length > 0 && status.trim().length > 0 && !isSubmitting;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      type,
      status,
      content: content.trim() || undefined,
      assignee_role: assigneeRole || undefined,
      creator_role: creatorRole || undefined,
      labels: labels.length > 0 ? labels : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Title */}
      <div>
        <label
          htmlFor="task-title"
          className="mb-1 block text-xs font-medium text-text-secondary"
        >
          Title <span aria-hidden="true" className="text-status-error">*</span>
        </label>
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={500}
          required
          disabled={isSubmitting}
          placeholder="Task title"
          aria-describedby={fieldErrors.title ? "task-title-error" : undefined}
          className={inputClass}
        />
        {fieldErrors.title && (
          <p id="task-title-error" role="alert" className={errorClass}>
            {fieldErrors.title}
          </p>
        )}
      </div>

      {/* Type */}
      <div>
        <label
          htmlFor="task-type"
          className="mb-1 block text-xs font-medium text-text-secondary"
        >
          Type <span aria-hidden="true" className="text-status-error">*</span>
        </label>
        <select
          id="task-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          required
          disabled={isSubmitting}
          aria-describedby={fieldErrors.type ? "task-type-error" : undefined}
          className={selectClass}
        >
          <option value="" disabled>
            Select type
          </option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {fieldErrors.type && (
          <p id="task-type-error" role="alert" className={errorClass}>
            {fieldErrors.type}
          </p>
        )}
      </div>

      {/* Status */}
      <div>
        <label
          htmlFor="task-status"
          className="mb-1 block text-xs font-medium text-text-secondary"
        >
          Status <span aria-hidden="true" className="text-status-error">*</span>
          {lockedStatus && (
            <span className="ml-1 text-text-muted">(pre-filled from column)</span>
          )}
        </label>
        <select
          id="task-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          required
          disabled={isSubmitting || Boolean(lockedStatus)}
          aria-describedby={fieldErrors.status ? "task-status-error" : undefined}
          aria-readonly={Boolean(lockedStatus)}
          className={selectClass}
        >
          <option value="" disabled>
            Select status
          </option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {fieldErrors.status && (
          <p id="task-status-error" role="alert" className={errorClass}>
            {fieldErrors.status}
          </p>
        )}
      </div>

      {/* Content (Markdown) */}
      <div>
        <label
          htmlFor="task-content"
          className="mb-1 block text-xs font-medium text-text-secondary"
        >
          Description (Markdown, optional)
        </label>
        <textarea
          id="task-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSubmitting}
          rows={4}
          placeholder="Optional task description (Markdown supported)"
          className={`${inputClass} resize-y`}
        />
      </div>

      {/* Assignee role */}
      <div>
        <label
          htmlFor="task-assignee"
          className="mb-1 block text-xs font-medium text-text-secondary"
        >
          Assignee role (optional)
        </label>
        <select
          id="task-assignee"
          value={assigneeRole}
          onChange={(e) => setAssigneeRole(e.target.value)}
          disabled={isSubmitting}
          aria-describedby={
            fieldErrors.assignee_role ? "task-assignee-error" : undefined
          }
          className={selectClass}
        >
          <option value="">None</option>
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {fieldErrors.assignee_role && (
          <p id="task-assignee-error" role="alert" className={errorClass}>
            {fieldErrors.assignee_role}
          </p>
        )}
      </div>

      {/* Creator role */}
      <div>
        <label
          htmlFor="task-creator"
          className="mb-1 block text-xs font-medium text-text-secondary"
        >
          Creator role (optional)
        </label>
        <select
          id="task-creator"
          value={creatorRole}
          onChange={(e) => setCreatorRole(e.target.value)}
          disabled={isSubmitting}
          aria-describedby={
            fieldErrors.creator_role ? "task-creator-error" : undefined
          }
          className={selectClass}
        >
          <option value="">None</option>
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {fieldErrors.creator_role && (
          <p id="task-creator-error" role="alert" className={errorClass}>
            {fieldErrors.creator_role}
          </p>
        )}
      </div>

      {/* Labels */}
      <div>
        <span className="mb-1 block text-xs font-medium text-text-secondary">
          Labels (optional)
        </span>
        <LabelsEditor
          value={labels}
          onChange={setLabels}
          disabled={isSubmitting}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border border-border px-4 py-1.5 text-sm text-text hover:bg-surface-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!titleValid || type.trim().length === 0 || status.trim().length === 0 || isSubmitting}
          className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
