/**
 * MilestoneForm — controlled form for creating or editing a milestone.
 *
 * In create mode the `projectId` prop is required (for the request body).
 * In edit mode only name and description are editable — project_id is immutable.
 * Calls `onSubmit` with validated values. Surfaces an inline error when
 * the parent provides a 409 conflict message.
 */

import { useState, type FormEvent } from "react";

export interface MilestoneFormValues {
  name: string;
  description: string;
}

interface MilestoneFormProps {
  /** Initial field values for edit mode; omit for create mode. */
  initialValues?: MilestoneFormValues;
  /** Called when the form is submitted with valid values. */
  onSubmit: (values: MilestoneFormValues) => void;
  /** Called when the user cancels. */
  onCancel: () => void;
  /** Disables the form while the mutation is in-flight. */
  isSubmitting: boolean;
  /** Inline error to display (e.g. 409 name conflict). */
  errorMessage?: string;
  /** Label for the submit button. Defaults to "Save". */
  submitLabel?: string;
}

const MAX_NAME = 200;
const MAX_DESCRIPTION = 5000;

function validate(values: MilestoneFormValues): Partial<MilestoneFormValues> {
  const errors: Partial<MilestoneFormValues> = {};
  if (!values.name.trim()) {
    errors.name = "Name is required.";
  } else if (values.name.trim().length > MAX_NAME) {
    errors.name = `Name must be ${MAX_NAME} characters or fewer.`;
  }
  if (values.description.length > MAX_DESCRIPTION) {
    errors.description = `Description must be ${MAX_DESCRIPTION} characters or fewer.`;
  }
  return errors;
}

/**
 * Reusable create/edit form for a milestone.
 * Handles client-side validation and delegates submission to the parent.
 */
export function MilestoneForm({
  initialValues = { name: "", description: "" },
  onSubmit,
  onCancel,
  isSubmitting,
  errorMessage,
  submitLabel = "Save",
}: MilestoneFormProps) {
  const [values, setValues] = useState<MilestoneFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<MilestoneFormValues>>({});

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    onSubmit({ name: values.name.trim(), description: values.description });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Name */}
      <div className="mb-4">
        <label htmlFor="milestone-name" className="mb-1 block text-sm font-medium text-text">
          Name <span aria-hidden="true" className="text-status-error">*</span>
        </label>
        <input
          id="milestone-name"
          type="text"
          value={values.name}
          onChange={(e) => {
            setValues((v) => ({ ...v, name: e.target.value }));
            if (fieldErrors.name) setFieldErrors((fe) => ({ ...fe, name: undefined }));
          }}
          maxLength={MAX_NAME}
          autoFocus
          required
          aria-required="true"
          aria-describedby={fieldErrors.name ? "milestone-name-error" : undefined}
          aria-invalid={Boolean(fieldErrors.name)}
          disabled={isSubmitting}
          className={[
            "w-full rounded-md border px-3 py-2 text-sm text-text shadow-sm outline-none",
            "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
            "disabled:opacity-50",
            fieldErrors.name ? "border-status-error" : "border-border",
          ].join(" ")}
          placeholder="Milestone name"
        />
        {fieldErrors.name && (
          <p id="milestone-name-error" role="alert" className="mt-1 text-xs text-status-error">
            {fieldErrors.name}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="mb-4">
        <label htmlFor="milestone-description" className="mb-1 block text-sm font-medium text-text">
          Description
        </label>
        <textarea
          id="milestone-description"
          value={values.description}
          onChange={(e) => {
            setValues((v) => ({ ...v, description: e.target.value }));
            if (fieldErrors.description)
              setFieldErrors((fe) => ({ ...fe, description: undefined }));
          }}
          maxLength={MAX_DESCRIPTION}
          rows={3}
          disabled={isSubmitting}
          aria-describedby={fieldErrors.description ? "milestone-description-error" : undefined}
          aria-invalid={Boolean(fieldErrors.description)}
          className={[
            "w-full resize-y rounded-md border px-3 py-2 text-sm text-text shadow-sm outline-none",
            "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
            "disabled:opacity-50",
            fieldErrors.description ? "border-status-error" : "border-border",
          ].join(" ")}
          placeholder="Optional description"
        />
        {fieldErrors.description && (
          <p
            id="milestone-description-error"
            role="alert"
            className="mt-1 text-xs text-status-error"
          >
            {fieldErrors.description}
          </p>
        )}
      </div>

      {/* API-level error (e.g. 409 name conflict) */}
      {errorMessage && (
        <p role="alert" className="mb-4 rounded bg-status-error/10 px-3 py-2 text-sm text-status-error">
          {errorMessage}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border border-border px-4 py-2 text-sm text-text hover:bg-surface-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
