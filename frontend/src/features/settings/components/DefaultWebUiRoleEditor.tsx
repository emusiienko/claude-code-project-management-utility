/**
 * DefaultWebUiRoleEditor — single-value dropdown editor for the
 * `default_web_ui_role` scalar setting.
 *
 * Unlike the five list-valued dictionaries (DictionaryEditor / LinkTypesEditor),
 * this setting holds exactly one value, so it is rendered as a native `<select>`
 * over the effective `participant_roles` list rather than a chip editor. Only
 * values currently present in `participantRoles` are offered, so a disallowed
 * value cannot be chosen client-side — the server remains authoritative for
 * validation on save.
 */

import { useState, useEffect, useRef, useId } from "react";
import { Pencil, RotateCcw } from "lucide-react";
import { IconButton } from "@/shared/components/IconButton";

interface DefaultWebUiRoleEditorProps {
  /** Current effective value (system default or project override). */
  value: string;
  /** Effective participant_roles — the only selectable options. */
  participantRoles: string[];
  /**
   * Called when the user confirms their edit. Receives the newly selected value.
   * Parent is responsible for calling the mutation and handling errors.
   */
  onSave: (newValue: string) => void;
  /** True while the parent mutation is in-flight. */
  isSaving: boolean;
  /** Error message to display beneath the editor when the mutation fails. */
  errorMessage?: string;
  /**
   * Optional badge shown next to the label when this key has a project-level
   * override (used in the Project Settings screen).
   */
  overrideBadge?: React.ReactNode;
  /**
   * Optional "Clear override" action shown only in the Project Settings screen.
   */
  onClearOverride?: () => void;
  isClearingOverride?: boolean;
}

/**
 * Single-value dropdown editor for the `default_web_ui_role` setting.
 */
export function DefaultWebUiRoleEditor({
  value,
  participantRoles,
  onSave,
  isSaving,
  errorMessage,
  overrideBadge,
  onClearOverride,
  isClearingOverride = false,
}: DefaultWebUiRoleEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [workingValue, setWorkingValue] = useState("");
  const headingId = useId();
  const selectId = useId();

  function startEditing() {
    // Fall back to the first available option if the current value has since
    // fallen outside the effective participant_roles set (a benign, documented
    // edge case for an inherited system default — see implementation_plan.md).
    setWorkingValue(participantRoles.includes(value) ? value : (participantRoles[0] ?? ""));
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
  }

  function handleSave() {
    if (!workingValue) return;
    onSave(workingValue);
  }

  const canSave = workingValue !== "" && !isSaving;

  // Exit edit mode automatically after a successful save (isSaving true → false
  // with no error), matching DictionaryEditor / LinkTypesEditor behavior.
  const wasSavingRef = useRef(false);
  useEffect(() => {
    if (wasSavingRef.current && !isSaving && !errorMessage) {
      setIsEditing(false);
    }
    wasSavingRef.current = isSaving;
  }, [isSaving, errorMessage]);

  return (
    <article
      aria-labelledby={headingId}
      className="rounded-md border border-border bg-surface p-4"
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 id={headingId} className="text-sm font-semibold text-text">
            Default Web UI role
          </h3>
          {overrideBadge}
        </div>

        <div className="flex items-center gap-2">
          {onClearOverride && (
            <IconButton
              Icon={RotateCcw}
              label="Clear override for Default Web UI role"
              intent="neutral"
              disabled={isClearingOverride}
              onClick={onClearOverride}
            />
          )}

          {!isEditing && (
            <IconButton
              Icon={Pencil}
              label="Edit Default Web UI role"
              intent="neutral"
              onClick={startEditing}
            />
          )}
        </div>
      </div>

      {/* Read-only view */}
      {!isEditing && (
        <p className="text-sm text-text">
          {value || <span className="text-xs text-text-muted italic">No value set</span>}
        </p>
      )}

      {/* Edit mode */}
      {isEditing && (
        <div>
          <label htmlFor={selectId} className="sr-only">
            Default Web UI role
          </label>
          <select
            id={selectId}
            value={workingValue}
            onChange={(e) => setWorkingValue(e.target.value)}
            disabled={isSaving}
            className="mb-3 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {participantRoles.length === 0 && <option value="">No roles available</option>}
            {participantRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          {errorMessage && (
            <p
              role="alert"
              className="mb-3 rounded bg-status-error/10 px-3 py-2 text-xs text-status-error"
            >
              {errorMessage}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
              aria-disabled={!canSave}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              disabled={isSaving}
              className="rounded border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-muted disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
