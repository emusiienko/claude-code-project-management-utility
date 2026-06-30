/**
 * SystemSettings — view and edit all six global dictionary values.
 *
 * Renders one DictionaryEditor per dictionary key. Each editor is
 * independent: saving one key sends only that key in the request body
 * (Partial<Settings>), matching the contract's "only provided keys updated"
 * semantics. Errors from any single save are scoped to that editor.
 */

import { useState } from "react";
import { useSystemSettings, useUpdateSystemSettings } from "@/api/settings";
import { DictionaryEditor, formatKeyLabel } from "./DictionaryEditor";
import { PageLoader } from "@/shared/ui/PageLoader";
import type { DictionaryKey } from "@/api/types";
import { ApiRequestError } from "@/api/client";

/** The six dictionary keys in display order. */
const DICT_KEYS: DictionaryKey[] = [
  "task_statuses",
  "task_types",
  "story_statuses",
  "attachment_types",
  "link_types",
  "participant_roles",
];

/**
 * Extracts a user-readable error message from an unknown thrown value.
 * Only exposes the server's human-readable `error` field — never raw internals.
 */
function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    return err.body.error;
  }
  return "An unexpected error occurred. Please try again.";
}

/**
 * System Settings tab content.
 * Consumes `useSystemSettings` and `useUpdateSystemSettings` hooks.
 */
export function SystemSettings() {
  const { data: settings, isLoading, isError, error } = useSystemSettings();
  const updateMutation = useUpdateSystemSettings();

  // Per-key save error messages — keyed by DictionaryKey.
  const [saveErrors, setSaveErrors] = useState<Partial<Record<DictionaryKey, string>>>({});
  // Per-key saving state (in-flight key).
  const [savingKey, setSavingKey] = useState<DictionaryKey | null>(null);

  function handleSave(key: DictionaryKey, newValues: string[]) {
    setSavingKey(key);
    setSaveErrors((prev) => ({ ...prev, [key]: undefined }));
    updateMutation.mutate(
      { [key]: newValues },
      {
        onSuccess: () => {
          setSavingKey(null);
        },
        onError: (err) => {
          setSavingKey(null);
          setSaveErrors((prev) => ({
            ...prev,
            [key]: extractErrorMessage(err),
          }));
        },
      },
    );
  }

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError) {
    return (
      <p role="alert" className="rounded bg-status-error/10 px-4 py-3 text-sm text-status-error">
        Failed to load system settings:{" "}
        {extractErrorMessage(error)}
      </p>
    );
  }

  if (!settings) {
    return (
      <p className="text-sm text-text-muted italic">No settings data available.</p>
    );
  }

  return (
    <section aria-label="System Settings">
      <p className="mb-4 text-sm text-text-secondary">
        These are the global defaults applied to all projects that have no
        per-key override. Changes take effect immediately for all unoverridden
        projects.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {DICT_KEYS.map((key) => (
          <DictionaryEditor
            key={key}
            label={formatKeyLabel(key)}
            values={settings[key]}
            onSave={(newValues) => handleSave(key, newValues)}
            isSaving={savingKey === key}
            errorMessage={saveErrors[key]}
          />
        ))}
      </div>
    </section>
  );
}
