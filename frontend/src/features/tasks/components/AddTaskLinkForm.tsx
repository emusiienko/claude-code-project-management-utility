/**
 * AddTaskLinkForm — inline form to create a new directed task link.
 *
 * Allows the user to select a target task (from the same story, excluding the
 * current task) and a directional link type from the expanded picker options.
 * The options show human-readable labels (e.g. "depends on", "dependent") instead
 * of raw dictionary keys. Source/target swap for inbound selections is signalled
 * back to the parent via the `direction` field in `onSubmit`.
 *
 * @param currentTaskId   - The task being viewed — excluded from the target list.
 * @param linkTypeOptions - Expanded link options from getLinkOptions; each has label, linkType, direction.
 * @param tasks           - Full list of tasks in this story (pre-fetched).
 * @param onSubmit        - Called with { target_task_id, link_type, direction } on submit.
 * @param onCancel        - Called when the user clicks Cancel.
 * @param isSubmitting    - True while the create mutation is in flight.
 * @param errorMessage    - Top-level error from the API call.
 * @param fieldErrors     - Per-field validation errors from the API.
 */

import { useState } from "react";
import type { Task } from "@/api/types";
import type { LinkOption, Direction } from "@/shared/utils/linkLabels";

interface AddTaskLinkFormProps {
  currentTaskId: string;
  linkTypeOptions: LinkOption[];
  tasks: Task[];
  onSubmit: (values: { target_task_id: string; link_type: string; direction: Direction }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  errorMessage?: string;
  fieldErrors?: Record<string, string>;
}

/** Inline form for adding a directed task link. */
export function AddTaskLinkForm({
  currentTaskId,
  linkTypeOptions,
  tasks,
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
  fieldErrors = {},
}: AddTaskLinkFormProps) {
  const candidateTasks = tasks.filter((t) => t.id !== currentTaskId);

  const [targetTaskId, setTargetTaskId] = useState("");
  // Store the selected option index so we can recover both linkType and direction.
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(
    linkTypeOptions.length > 0 ? 0 : -1,
  );

  const selectedOption = selectedOptionIndex >= 0 ? linkTypeOptions[selectedOptionIndex] : undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetTaskId || !selectedOption) return;
    onSubmit({
      target_task_id: targetTaskId,
      link_type: selectedOption.linkType,
      direction: selectedOption.direction,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Add task link"
      className="mt-3 rounded-md border border-border bg-surface-muted p-4"
    >
      {/* Top-level error */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-3 rounded bg-status-error/10 px-3 py-2 text-sm text-status-error"
        >
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {/* Target task selector */}
        <div className="flex-1">
          <label
            htmlFor="add-link-target"
            className="mb-1 block text-xs font-medium text-text-secondary"
          >
            Target task
          </label>
          <select
            id="add-link-target"
            value={targetTaskId}
            onChange={(e) => setTargetTaskId(e.target.value)}
            disabled={isSubmitting}
            required
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-60"
            aria-describedby={
              fieldErrors.target_task_id ? "link-target-error" : undefined
            }
          >
            <option value="">— select a task —</option>
            {candidateTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          {fieldErrors.target_task_id && (
            <p
              id="link-target-error"
              role="alert"
              className="mt-1 text-xs text-status-error"
            >
              {fieldErrors.target_task_id}
            </p>
          )}
          {candidateTasks.length === 0 && (
            <p className="mt-1 text-xs text-text-muted">
              No other tasks in this story.
            </p>
          )}
        </div>

        {/* Link type selector */}
        <div className="sm:w-44">
          <label
            htmlFor="add-link-type"
            className="mb-1 block text-xs font-medium text-text-secondary"
          >
            Link type
          </label>
          <select
            id="add-link-type"
            value={selectedOptionIndex >= 0 ? String(selectedOptionIndex) : ""}
            onChange={(e) => setSelectedOptionIndex(Number(e.target.value))}
            disabled={isSubmitting || linkTypeOptions.length === 0}
            required
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-60"
            aria-describedby={
              fieldErrors.link_type ? "link-type-error" : undefined
            }
          >
            {linkTypeOptions.length === 0 ? (
              <option value="">— no link types configured —</option>
            ) : (
              linkTypeOptions.map((opt, idx) => (
                <option key={`${opt.linkType}-${opt.direction}`} value={idx}>
                  {opt.label}
                </option>
              ))
            )}
          </select>
          {fieldErrors.link_type && (
            <p
              id="link-type-error"
              role="alert"
              className="mt-1 text-xs text-status-error"
            >
              {fieldErrors.link_type}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 sm:shrink-0">
          <button
            type="submit"
            disabled={isSubmitting || !targetTaskId || !selectedOption}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50"
          >
            {isSubmitting ? "Adding…" : "Add"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-md border border-border px-4 py-2 text-sm text-text hover:bg-surface-muted disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
