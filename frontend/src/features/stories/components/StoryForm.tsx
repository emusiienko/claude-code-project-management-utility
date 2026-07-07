/**
 * StoryForm — controlled form for creating or editing a story.
 *
 * Fields: title (required), content (optional Markdown textarea),
 * status (dropdown from project's effective story_statuses, optional),
 * labels (shared LabelsEditor component).
 *
 * The milestone_id field is intentionally omitted — it is not surfaced
 * in the UI until STORY-012.
 */

import { useState, type FormEvent } from "react";
import { LabelsEditor } from "@/shared/components/LabelsEditor";
import type { Label } from "@/api/types";

export interface StoryFormValues {
  title: string;
  content: string;
  status: string;
  labels: Label[];
}

interface StoryFormProps {
  /** Initial field values — provide for edit mode; omit for create mode. */
  initialValues?: StoryFormValues;
  /** Allowed status values from the project's effective story_statuses dict. */
  statusOptions: string[];
  /** Called when the user submits the form with valid data. */
  onSubmit: (values: StoryFormValues) => void;
  /** Called when the user cancels. */
  onCancel: () => void;
  /** Disables all inputs while a mutation is in-flight. */
  isSubmitting: boolean;
  /** Inline API-level error message (e.g. 422 status validation). */
  errorMessage?: string;
  /** Label for the submit button. Defaults to "Save". */
  submitLabel?: string;
}

interface FieldErrors {
  title?: string;
}

const MAX_TITLE = 500;
const MAX_CONTENT = 50000;

function validate(values: StoryFormValues): FieldErrors {
  const errors: FieldErrors = {};
  const trimmedTitle = values.title.trim();
  if (!trimmedTitle) {
    errors.title = "Title is required.";
  } else if (trimmedTitle.length > MAX_TITLE) {
    errors.title = `Title must be ${MAX_TITLE} characters or fewer.`;
  }
  return errors;
}

const DEFAULT_VALUES: StoryFormValues = {
  title: "",
  content: "",
  status: "",
  labels: [],
};

/**
 * Create/edit form for a story.
 * Handles client-side validation and delegates submission to the parent.
 */
export function StoryForm({
  initialValues = DEFAULT_VALUES,
  statusOptions,
  onSubmit,
  onCancel,
  isSubmitting,
  errorMessage,
  submitLabel = "Save",
}: StoryFormProps) {
  const [values, setValues] = useState<StoryFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    onSubmit({
      title: values.title.trim(),
      content: values.content,
      status: values.status,
      labels: values.labels,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Title */}
      <div className="mb-4">
        <label
          htmlFor="story-title"
          className="mb-1 block text-sm font-medium text-text"
        >
          Title <span aria-hidden="true" className="text-status-error">*</span>
        </label>
        <input
          id="story-title"
          type="text"
          value={values.title}
          onChange={(e) => {
            setValues((v) => ({ ...v, title: e.target.value }));
            if (fieldErrors.title) setFieldErrors((fe) => ({ ...fe, title: undefined }));
          }}
          maxLength={MAX_TITLE}
          autoFocus
          required
          aria-required="true"
          aria-describedby={fieldErrors.title ? "story-title-error" : undefined}
          aria-invalid={Boolean(fieldErrors.title)}
          disabled={isSubmitting}
          className={[
            "w-full rounded-md border px-3 py-2 text-sm text-text shadow-sm outline-none",
            "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
            "disabled:opacity-50",
            fieldErrors.title ? "border-status-error" : "border-border",
          ].join(" ")}
          placeholder="Story title"
        />
        {fieldErrors.title && (
          <p id="story-title-error" role="alert" className="mt-1 text-xs text-status-error">
            {fieldErrors.title}
          </p>
        )}
      </div>

      {/* Status */}
      <div className="mb-4">
        <label
          htmlFor="story-status"
          className="mb-1 block text-sm font-medium text-text"
        >
          Status
        </label>
        <select
          id="story-status"
          value={values.status}
          onChange={(e) => setValues((v) => ({ ...v, status: e.target.value }))}
          disabled={isSubmitting}
          className="w-full rounded-md border border-border px-3 py-2 text-sm text-text shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
        >
          <option value="">— No status —</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="mb-4">
        <label
          htmlFor="story-content"
          className="mb-1 block text-sm font-medium text-text"
        >
          Content
          <span className="ml-1 text-xs font-normal text-text-muted">(Markdown)</span>
        </label>
        <textarea
          id="story-content"
          value={values.content}
          onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
          maxLength={MAX_CONTENT}
          rows={6}
          disabled={isSubmitting}
          className="w-full resize-y rounded-md border border-border px-3 py-2 text-sm text-text shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
          placeholder="Optional Markdown content…"
        />
      </div>

      {/* Labels */}
      <div className="mb-4">
        <p className="mb-1 block text-sm font-medium text-text">Labels</p>
        <LabelsEditor
          value={values.labels}
          onChange={(labels) => setValues((v) => ({ ...v, labels }))}
          disabled={isSubmitting}
        />
      </div>

      {/* API-level error */}
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
