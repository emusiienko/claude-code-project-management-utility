/**
 * LabelsEditor — controlled editor for an array of key-value label pairs.
 *
 * Renders the current list of `{ key, value }` pairs with per-row remove
 * buttons, plus an "Add label" row with two text inputs (key + value) and an
 * add button. The component carries no data-fetching or business logic — all
 * state lives in the parent via the `value` / `onChange` contract.
 *
 * Re-exports the `Label` type from `@/api/types` so consumers can import both
 * from a single location.
 */

import { useState, useId } from "react";
import { X } from "lucide-react";
import { IconButton } from "@/shared/components/IconButton";
import type { Label } from "@/api/types";

export type { Label };

export interface LabelsEditorProps {
  /** Current list of key-value labels. */
  value: Label[];
  /** Called with the updated list whenever a label is added or removed. */
  onChange: (labels: Label[]) => void;
  /** When true all inputs and buttons are non-interactive. */
  disabled?: boolean;
}

/**
 * Fully controlled key-value pair editor used for story, task, and comment
 * labels throughout the app.
 *
 * Add is a text button; per-row remove uses the shared `IconButton` primitive
 * (destructive intent). Key is required — the Add button is disabled until
 * the key field is non-empty.
 */
export function LabelsEditor({ value, onChange, disabled = false }: LabelsEditorProps) {
  const id = useId();
  const keyInputId = `${id}-key`;
  const valueInputId = `${id}-value`;

  const [draftKey, setDraftKey] = useState("");
  const [draftValue, setDraftValue] = useState("");

  function addLabel() {
    const trimmedKey = draftKey.trim();
    if (!trimmedKey) return;
    onChange([...value, { key: trimmedKey, value: draftValue.trim() }]);
    setDraftKey("");
    setDraftValue("");
  }

  function removeLabel(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addLabel();
    }
  }

  const canAdd = draftKey.trim().length > 0 && !disabled;

  return (
    <div className="space-y-2">
      {/* Existing labels list */}
      {value.length === 0 ? (
        <p
          data-testid="labels-editor-empty"
          className="text-xs text-text-muted italic"
        >
          No labels added.
        </p>
      ) : (
        <ul aria-label="Labels" className="space-y-1">
          {value.map((label, index) => (
            <li
              key={`${label.key}-${index}`}
              className="flex items-center gap-2"
            >
              <span className="flex min-w-0 flex-1 items-center gap-1 rounded bg-surface-muted px-2 py-1 text-xs text-text">
                <span className="font-medium text-text">{label.key}</span>
                {label.value && (
                  <>
                    <span className="text-text-muted">:</span>
                    <span className="text-text-secondary">{label.value}</span>
                  </>
                )}
              </span>
              <IconButton
                Icon={X}
                label={`Remove ${label.key}${label.value ? `:${label.value}` : ""}`}
                intent="destructive"
                disabled={disabled}
                onClick={() => removeLabel(index)}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Add label row */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          <label htmlFor={keyInputId} className="sr-only">
            Label key
          </label>
          <input
            id={keyInputId}
            type="text"
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="key"
            disabled={disabled}
            aria-required="true"
            className="w-2/5 rounded border border-border px-2 py-1 text-xs text-text placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-40"
          />
          <label htmlFor={valueInputId} className="sr-only">
            Label value
          </label>
          <input
            id={valueInputId}
            type="text"
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="value (optional)"
            disabled={disabled}
            className="flex-1 rounded border border-border px-2 py-1 text-xs text-text placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-40"
          />
        </div>
        <button
          type="button"
          onClick={addLabel}
          disabled={!canAdd}
          className="shrink-0 rounded bg-surface-muted px-3 py-1 text-xs font-medium text-text hover:bg-border disabled:opacity-40"
        >
          Add label
        </button>
      </div>
    </div>
  );
}
