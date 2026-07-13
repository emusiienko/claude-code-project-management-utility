/**
 * LinkTypesEditor — three-field inline editor for the link_types dictionary.
 *
 * Renders one row per structured entry with editable Value, Outbound label,
 * and Inbound label fields. This is a dedicated replacement for the generic
 * DictionaryEditor used exclusively for the link_types key.
 *
 * The generic DictionaryEditor is intentionally NOT modified — this component
 * is a standalone addition.
 */

import { useState, useEffect, useRef, useId } from "react";
import { Pencil, RotateCcw, X } from "lucide-react";
import { IconButton } from "@/shared/components/IconButton";
import type { LinkTypeEntry } from "@/api/types";

interface LinkTypesEditorProps {
  /** Current structured entries for the link_types dictionary key. */
  entries: LinkTypeEntry[];
  /**
   * Called when the user confirms their edit. Receives the new entries array.
   * Parent is responsible for calling the mutation and handling errors.
   */
  onSave: (entries: LinkTypeEntry[]) => void;
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

/** A blank entry template for the "Add entry" action. */
const BLANK_ENTRY: LinkTypeEntry = { value: "", outbound: "", inbound: "" };

/**
 * Returns true when all three fields of every entry are non-empty strings.
 * This is the client-side guard for enabling the Save button.
 */
function allFieldsFilled(entries: LinkTypeEntry[]): boolean {
  return (
    entries.length > 0 &&
    entries.every(
      (e) => e.value.trim() !== "" && e.outbound.trim() !== "" && e.inbound.trim() !== "",
    )
  );
}

/**
 * Three-field Settings editor for the link_types dictionary key.
 * Renders Value, Outbound label, and Inbound label columns per entry.
 */
export function LinkTypesEditor({
  entries,
  onSave,
  isSaving,
  errorMessage,
  overrideBadge,
  onClearOverride,
  isClearingOverride = false,
}: LinkTypesEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  // Local copy mutated during an edit session; reset when the user cancels.
  const [workingEntries, setWorkingEntries] = useState<LinkTypeEntry[]>([]);
  const headingId = useId();

  function startEditing() {
    setWorkingEntries(entries.map((e) => ({ ...e })));
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
  }

  function removeEntry(index: number) {
    setWorkingEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function addEntry() {
    setWorkingEntries((prev) => [...prev, { ...BLANK_ENTRY }]);
  }

  function updateField(
    index: number,
    field: keyof LinkTypeEntry,
    value: string,
  ) {
    setWorkingEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
    );
  }

  function handleSave() {
    if (!allFieldsFilled(workingEntries)) return;
    onSave(workingEntries);
  }

  const canSave = allFieldsFilled(workingEntries) && !isSaving;

  // Exit edit mode automatically after a successful save (isSaving true → false
  // with no error). A ref tracks the previous isSaving value without triggering
  // extra re-renders.
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
      className="rounded-md border border-border bg-surface p-4 sm:col-span-2"
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 id={headingId} className="text-sm font-semibold text-text">
            Link Types
          </h3>
          {overrideBadge}
        </div>

        <div className="flex items-center gap-2">
          {onClearOverride && (
            <IconButton
              Icon={RotateCcw}
              label="Clear override for Link Types"
              intent="neutral"
              disabled={isClearingOverride}
              onClick={onClearOverride}
            />
          )}

          {!isEditing && (
            <IconButton
              Icon={Pencil}
              label="Edit Link Types"
              intent="neutral"
              onClick={startEditing}
            />
          )}
        </div>
      </div>

      {/* Read-only view */}
      {!isEditing && (
        <div role="list" aria-label="Link Types entries">
          {entries.length > 0 ? (
            <>
              {/* Column header */}
              <div
                className="mb-1 grid grid-cols-3 gap-2 px-1 text-xs font-medium text-text-secondary"
                aria-hidden="true"
              >
                <span>Value</span>
                <span>Outbound label</span>
                <span>Inbound label</span>
              </div>
              {entries.map((entry, i) => (
                <div
                  key={`${entry.value}-${i}`}
                  role="listitem"
                  className="grid grid-cols-3 gap-2 rounded px-1 py-1 text-xs text-text even:bg-surface-muted"
                >
                  <span className="font-mono">{entry.value}</span>
                  <span>{entry.outbound}</span>
                  <span>{entry.inbound}</span>
                </div>
              ))}
            </>
          ) : (
            <p className="text-xs text-text-muted italic">No link types defined.</p>
          )}
        </div>
      )}

      {/* Edit mode */}
      {isEditing && (
        <div>
          {/* Column headers */}
          <div
            className="mb-1 grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 px-1 text-xs font-medium text-text-secondary"
            aria-hidden="true"
          >
            <span>Value</span>
            <span>Outbound label</span>
            <span>Inbound label</span>
            <span />
          </div>

          {/* Entry rows */}
          <ul aria-label="Link Types entries being edited" className="mb-3 space-y-2">
            {workingEntries.map((entry, index) => (
              <li
                key={index}
                className="grid grid-cols-[1fr_1fr_1fr_2rem] items-center gap-2"
              >
                <input
                  type="text"
                  aria-label={`Value for entry ${index + 1}`}
                  value={entry.value}
                  onChange={(e) => updateField(index, "value", e.target.value)}
                  placeholder="e.g. depends-on"
                  className="rounded border border-border px-2 py-1 text-xs text-text placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <input
                  type="text"
                  aria-label={`Outbound label for entry ${index + 1}`}
                  value={entry.outbound}
                  onChange={(e) => updateField(index, "outbound", e.target.value)}
                  placeholder="e.g. depends on"
                  className="rounded border border-border px-2 py-1 text-xs text-text placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <input
                  type="text"
                  aria-label={`Inbound label for entry ${index + 1}`}
                  value={entry.inbound}
                  onChange={(e) => updateField(index, "inbound", e.target.value)}
                  placeholder="e.g. dependent"
                  className="rounded border border-border px-2 py-1 text-xs text-text placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <IconButton
                  Icon={X}
                  label={`Remove link type entry ${index + 1}`}
                  intent="neutral"
                  onClick={() => removeEntry(index)}
                />
              </li>
            ))}

            {workingEntries.length === 0 && (
              <li>
                <span className="text-xs text-status-warning italic">
                  No entries — add at least one before saving.
                </span>
              </li>
            )}
          </ul>

          {/* Add entry */}
          <button
            type="button"
            onClick={addEntry}
            className="mb-3 rounded border border-dashed border-border px-3 py-1.5 text-xs text-text-secondary hover:border-brand-400 hover:text-brand-600"
          >
            + Add entry
          </button>

          {/* Validation hint when fields are incomplete */}
          {workingEntries.length > 0 && !allFieldsFilled(workingEntries) && (
            <p
              role="alert"
              className="mb-3 text-xs text-status-warning italic"
            >
              All three fields (Value, Outbound label, Inbound label) must be filled for every entry.
            </p>
          )}

          {/* Server error message */}
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
