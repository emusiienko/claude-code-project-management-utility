/**
 * SystemSettings — view and edit all five global dictionary values.
 *
 * Renders one DictionaryEditor per dictionary key. Each editor is
 * independent: saving one key sends only that key in the request body
 * (Partial<Settings>), matching the contract's "only provided keys updated"
 * semantics. Errors from any single save are scoped to that editor.
 */

import { useState } from "react";
import { useSystemSettings, useUpdateSystemSettings } from "@/features/settings/hooks/useSystemSettings";
import { DictionaryEditor, formatKeyLabel } from "./DictionaryEditor";
import { LinkTypesEditor } from "./LinkTypesEditor";
import { PageLoader } from "@/shared/components/PageLoader";
import type { DictionaryKey, LinkTypeEntry } from "@/api/types";
import { ApiRequestError } from "@/core/client";

/**
 * The four plain-string dictionary keys rendered by the generic DictionaryEditor.
 * link_types is excluded here — it uses structured objects and has a
 * dedicated three-field editor (STORY-020 TASK-005).
 */
const PLAIN_DICT_KEYS: Exclude<DictionaryKey, "link_types">[] = [
  "task_statuses",
  "task_types",
  "story_statuses",
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

  function handleSave(key: Exclude<DictionaryKey, "link_types">, newValues: string[]) {
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

  function handleSaveLinkTypes(newEntries: LinkTypeEntry[]) {
    setSavingKey("link_types");
    setSaveErrors((prev) => ({ ...prev, link_types: undefined }));
    updateMutation.mutate(
      { link_types: newEntries },
      {
        onSuccess: () => {
          setSavingKey(null);
        },
        onError: (err) => {
          setSavingKey(null);
          setSaveErrors((prev) => ({
            ...prev,
            link_types: extractErrorMessage(err),
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
        {PLAIN_DICT_KEYS.map((key) => (
          <DictionaryEditor
            key={key}
            label={formatKeyLabel(key)}
            values={settings[key]}
            onSave={(newValues) => handleSave(key, newValues)}
            isSaving={savingKey === key}
            errorMessage={saveErrors[key]}
          />
        ))}

        <LinkTypesEditor
          entries={settings.link_types}
          onSave={handleSaveLinkTypes}
          isSaving={savingKey === "link_types"}
          errorMessage={saveErrors.link_types}
        />
      </div>
    </section>
  );
}
