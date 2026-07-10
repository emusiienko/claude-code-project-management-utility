/**
 * StoryForm — controlled form for creating or editing a story.
 *
 * Fields: title (required), content (optional Markdown textarea),
 * status (dropdown from project's effective story_statuses, optional),
 * milestone (dropdown from project's milestones, optional),
 * labels (shared LabelsEditor component).
 */

import { useState, type FormEvent } from "react";
import { LabelsEditor } from "@/shared/components/LabelsEditor";
import type { Label, Milestone } from "@/api/types";

export interface StoryFormValues {
  title: string;
  content: string;
  status: string;
  labels: Label[];
  /** null = explicitly cleared (send null to API); undefined = not changed */
  milestone_id: string | null;
}

interface StoryFormProps {
  /** Initial field values — provide for edit mode; omit for create mode. */
  initialValues?: StoryFormValues;
  /** Allowed status values from the project's effective story_statuses dict. */
  statusOptions: string[];
  /**
   * Milestones available for selection — should be scoped to the story's project.
   * When undefined the milestone field is hidden (e.g. milestones not yet loaded).
   * An empty array shows the field in a "no milestones" disabled state.
   */
  milestoneOptions?: Milestone[];
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
  milestone_id: null,
};

/** Capitalizes the first letter of a milestone status for display. */
function capitalizeStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Create/edit form for a story.
 * Handles client-side validation and delegates submission to the parent.
 */
export function StoryForm({
  initialValues = DEFAULT_VALUES,
  statusOptions,
  milestoneOptions,
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
      milestone_id: values.milestone_id,
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

      {/* Milestone (shown only when milestoneOptions is provided) */}
      {milestoneOptions !== undefined && (
        <div className="mb-4">
          <label
            htmlFor="story-milestone"
            className="mb-1 block text-sm font-medium text-text"
          >
            Milestone
          </label>
          <select
            id="story-milestone"
            value={values.milestone_id ?? ""}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                milestone_id: e.target.value === "" ? null : e.target.value,
              }))
            }
            disabled={isSubmitting || milestoneOptions.length === 0}
            className="w-full rounded-md border border-border px-3 py-2 text-sm text-text shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
          >
            <option value="">— None —</option>
            {milestoneOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.status !== "planned"
                  ? ` (${capitalizeStatus(m.status)})`
                  : ""}
              </option>
            ))}
          </select>
          {milestoneOptions.length === 0 && (
            <p className="mt-1 text-xs italic text-text-muted">
              No milestones in this project yet.
            </p>
          )}
        </div>
      )}

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
