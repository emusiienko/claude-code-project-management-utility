/**
 * DictionaryEditor — inline editor for a single dictionary key's string array.
 *
 * Renders the current list of values with per-item delete buttons, an input
 * for adding new values, and Save / Cancel controls. The component is
 * intentionally stateless beyond its own local edit buffer — all persistence
 * is delegated to the parent via `onSave`.
 *
 * The server is authoritative for validation. The only client-side guard is
 * disabling Save when the working list is empty (400 "Dictionary values
 * cannot be empty." from the server would occur anyway, but disabling save
 * on an empty list gives immediate UX feedback).
 */

import { useState, useEffect, useRef, useId, type KeyboardEvent } from "react";
import { Pencil, RotateCcw, X } from "lucide-react";
import { IconButton } from "@/shared/components/IconButton";

interface DictionaryEditorProps {
  /** Human-readable label, e.g. "Task Statuses". */
  label: string;
  /** Current values for this dictionary key. */
  values: string[];
  /**
   * Called when the user confirms their edit. Receives the new value array.
   * Parent is responsible for calling the mutation and handling errors.
   */
  onSave: (newValues: string[]) => void;
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
   * Rendered as a button after the heading.
   */
  onClearOverride?: () => void;
  isClearingOverride?: boolean;
}

/**
 * Converts a raw dictionary key name (snake_case) to a human-readable label.
 * Used when `label` is not explicitly provided (not used here — label is required).
 */
function formatKeyLabel(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
// exported for reuse in the settings screens
export { formatKeyLabel };

/**
 * Single-key inline dictionary editor with add/remove controls and save/cancel.
 */
export function DictionaryEditor({
  label,
  values,
  onSave,
  isSaving,
  errorMessage,
  overrideBadge,
  onClearOverride,
  isClearingOverride = false,
}: DictionaryEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  // Local copy mutated during an edit session; reset when user cancels.
  const [workingValues, setWorkingValues] = useState<string[]>([]);
  const [newValue, setNewValue] = useState("");
  const inputId = useId();

  function startEditing() {
    setWorkingValues([...values]);
    setNewValue("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setNewValue("");
  }

  function removeValue(index: number) {
    setWorkingValues((prev) => prev.filter((_, i) => i !== index));
  }

  function addValue() {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    setWorkingValues((prev) => [...prev, trimmed]);
    setNewValue("");
  }

  function handleNewValueKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addValue();
    }
  }

  function handleSave() {
    if (workingValues.length === 0) return;
    onSave(workingValues);
  }

  const canSave = workingValues.length > 0 && !isSaving;

  // Track whether a save is in-flight so we can detect the isSaving true→false
  // transition. On that transition, if there is no error, the save succeeded
  // and we exit edit mode. Using a ref avoids re-renders while tracking the
  // previous value.
  const wasSavingRef = useRef(false);
  useEffect(() => {
    if (wasSavingRef.current && !isSaving && !errorMessage) {
      setIsEditing(false);
      setNewValue("");
    }
    wasSavingRef.current = isSaving;
  }, [isSaving, errorMessage]);

  return (
    <article
      aria-labelledby={`${inputId}-heading`}
      className="rounded-md border border-border bg-surface p-4"
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3
            id={`${inputId}-heading`}
            className="text-sm font-semibold text-text"
          >
            {label}
          </h3>
          {overrideBadge}
        </div>

        <div className="flex items-center gap-2">
          {onClearOverride && (
            <IconButton
              Icon={RotateCcw}
              label={`Clear override for ${label}`}
              intent="neutral"
              disabled={isClearingOverride}
              onClick={onClearOverride}
            />
          )}

          {!isEditing && (
            <IconButton
              Icon={Pencil}
              label={`Edit ${label}`}
              intent="neutral"
              onClick={startEditing}
            />
          )}
        </div>
      </div>

      {/* Current value list (read-only view) */}
      {!isEditing && (
        <ul
          aria-label={`${label} values`}
          className="flex flex-wrap gap-1.5"
        >
          {values.length > 0 ? (
            values.map((v) => (
              <li key={v}>
                <span className="inline-block rounded-sm bg-surface-muted px-2 py-0.5 text-xs text-text">
                  {v}
                </span>
              </li>
            ))
          ) : (
            <li>
              <span className="text-xs text-text-muted italic">No values</span>
            </li>
          )}
        </ul>
      )}

      {/* Edit mode */}
      {isEditing && (
        <div>
          {/* Working value chips with remove buttons */}
          <ul
            aria-label={`${label} values being edited`}
            className="mb-3 flex flex-wrap gap-1.5"
          >
            {workingValues.map((v, i) => (
              <li key={`${v}-${i}`} className="flex items-center">
                <span className="flex items-center gap-0.5 rounded-sm bg-brand-100 py-0.5 pl-2 pr-0.5 text-xs text-brand-700">
                  {v}
                  <IconButton
                    Icon={X}
                    label={`Remove ${v} from ${label}`}
                    intent="neutral"
                    onClick={() => removeValue(i)}
                    className="h-5 w-5"
                  />
                </span>
              </li>
            ))}
            {workingValues.length === 0 && (
              <li>
                <span className="text-xs text-status-warning italic">
                  List is empty — add at least one value before saving.
                </span>
              </li>
            )}
          </ul>

          {/* Add new value input */}
          <div className="mb-3 flex gap-2">
            <label htmlFor={inputId} className="sr-only">
              New value for {label}
            </label>
            <input
              id={inputId}
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={handleNewValueKeyDown}
              placeholder="Type a value and press Enter or Add"
              className="flex-1 rounded border border-border px-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={addValue}
              disabled={!newValue.trim()}
              className="rounded bg-surface-muted px-3 py-1.5 text-sm font-medium text-text hover:bg-border disabled:opacity-40"
            >
              Add
            </button>
          </div>

          {/* Error message */}
          {errorMessage && (
            <p
              role="alert"
              className="mb-3 rounded bg-status-error/10 px-3 py-2 text-xs text-status-error"
            >
              {errorMessage}
            </p>
          )}

          {/* Save / Cancel */}
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
