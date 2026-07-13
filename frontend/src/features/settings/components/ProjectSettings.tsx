/**
 * ProjectSettings — view effective settings per project, set overrides, and
 * clear overrides back to system defaults.
 *
 * The screen is split into two panels:
 *   1. A project selector (left/top) listing all projects.
 *   2. An effective settings editor (right/bottom) for the selected project,
 *      showing which keys are overridden vs. falling through to the system
 *      default — with a "Clear override" action on overridden keys.
 *
 * Data flow:
 *   - useProjectList → populates the project selector
 *   - useProjectSettings(id) → stored overrides (tells us which keys are overridden)
 *   - useProjectSettingsEffective(id) → merged values shown in each editor
 *   - useSetProjectOverride → PUT /v1/projects/:id/settings
 *   - useClearProjectOverride → DELETE /v1/projects/:id/settings/:key
 */

import { useState } from "react";
import { useProjectList } from "@/shared/hooks/useProjectList";
import {
  useProjectSettings,
  useProjectSettingsEffective,
  useSetProjectOverride,
  useClearProjectOverride,
} from "@/features/settings/hooks/useProjectSettings";
import { DictionaryEditor, formatKeyLabel } from "./DictionaryEditor";
import { LinkTypesEditor } from "./LinkTypesEditor";
import { PageLoader } from "@/shared/components/PageLoader";
import type { DictionaryKey, LinkTypeEntry } from "@/api/types";
import { ApiRequestError } from "@/core/client";

/**
 * The five plain-string dictionary keys rendered by the generic DictionaryEditor.
 * link_types is excluded here — it uses structured objects and will have a
 * dedicated three-field editor (STORY-020 TASK-005).
 */
const PLAIN_DICT_KEYS: Exclude<DictionaryKey, "link_types">[] = [
  "task_statuses",
  "task_types",
  "story_statuses",
  "attachment_types",
  "participant_roles",
];

/**
 * Extracts a user-readable error message. Never exposes raw internals.
 */
function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    return err.body.error;
  }
  return "An unexpected error occurred. Please try again.";
}

// ---------------------------------------------------------------------------
// OverrideBadge — small indicator when a key has a project override
// ---------------------------------------------------------------------------

/** Pill badge shown next to a dictionary key label when it has an override. */
function OverrideBadge() {
  return (
    <span
      className="inline-block rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700"
      title="This key has a project-level override"
      aria-label="Overridden"
    >
      Override
    </span>
  );
}

// ---------------------------------------------------------------------------
// EffectiveSettingsPanel — editors for the selected project
// ---------------------------------------------------------------------------

interface EffectiveSettingsPanelProps {
  projectId: string;
}

/**
 * Renders a DictionaryEditor for each of the six dictionary keys, using the
 * project's effective settings as the displayed values. Shows an "Override"
 * badge on keys that have project-level overrides and a "Clear override" button.
 *
 * Exported so that project-context routes (e.g. /projects/:id/settings) can
 * embed it directly with the project ID from the route param, without the
 * project-selector side panel.
 */
export function EffectiveSettingsPanel({ projectId }: EffectiveSettingsPanelProps) {
  const {
    data: effectiveSettings,
    isLoading: isLoadingEffective,
    isError: isErrorEffective,
    error: effectiveError,
  } = useProjectSettingsEffective(projectId);

  const {
    data: storedOverrides,
    isLoading: isLoadingOverrides,
  } = useProjectSettings(projectId);

  const setOverrideMutation = useSetProjectOverride();
  const clearOverrideMutation = useClearProjectOverride();

  const [saveErrors, setSaveErrors] = useState<
    Partial<Record<DictionaryKey, string>>
  >({});
  const [savingKey, setSavingKey] = useState<DictionaryKey | null>(null);
  const [clearingKey, setClearingKey] = useState<DictionaryKey | null>(null);

  function handleSave(key: Exclude<DictionaryKey, "link_types">, newValues: string[]) {
    setSavingKey(key);
    setSaveErrors((prev) => ({ ...prev, [key]: undefined }));
    setOverrideMutation.mutate(
      { projectId, body: { [key]: newValues } },
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
    setOverrideMutation.mutate(
      { projectId, body: { link_types: newEntries } },
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

  function handleClearOverride(key: DictionaryKey) {
    setClearingKey(key);
    clearOverrideMutation.mutate(
      { projectId, key },
      {
        onSuccess: () => {
          setClearingKey(null);
        },
        onError: () => {
          setClearingKey(null);
        },
      },
    );
  }

  if (isLoadingEffective || isLoadingOverrides) {
    return <PageLoader />;
  }

  if (isErrorEffective) {
    return (
      <p
        role="alert"
        className="rounded bg-status-error/10 px-4 py-3 text-sm text-status-error"
      >
        Failed to load project settings:{" "}
        {extractErrorMessage(effectiveError)}
      </p>
    );
  }

  if (!effectiveSettings) {
    return (
      <p className="text-sm text-text-muted italic">
        No effective settings data available.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PLAIN_DICT_KEYS.map((key) => {
        const isOverridden = Boolean(
          storedOverrides && key in storedOverrides,
        );

        return (
          <DictionaryEditor
            key={key}
            label={formatKeyLabel(key)}
            values={effectiveSettings[key]}
            onSave={(newValues) => handleSave(key, newValues)}
            isSaving={savingKey === key}
            errorMessage={saveErrors[key]}
            overrideBadge={isOverridden ? <OverrideBadge /> : undefined}
            onClearOverride={
              isOverridden ? () => handleClearOverride(key) : undefined
            }
            isClearingOverride={clearingKey === key}
          />
        );
      })}

      <LinkTypesEditor
        entries={effectiveSettings.link_types}
        onSave={handleSaveLinkTypes}
        isSaving={savingKey === "link_types"}
        errorMessage={saveErrors.link_types}
        overrideBadge={
          storedOverrides && "link_types" in storedOverrides ? <OverrideBadge /> : undefined
        }
        onClearOverride={
          storedOverrides && "link_types" in storedOverrides
            ? () => handleClearOverride("link_types")
            : undefined
        }
        isClearingOverride={clearingKey === "link_types"}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProjectSelector — left panel listing all projects
// ---------------------------------------------------------------------------

interface ProjectSelectorProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Renders a vertical list of project names. The selected project is
 * highlighted. Handles loading and error states.
 */
function ProjectSelector({ selectedId, onSelect }: ProjectSelectorProps) {
  const { data: projects, isLoading, isError, error } = useProjectList();

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError) {
    return (
      <p
        role="alert"
        className="rounded bg-status-error/10 px-3 py-2 text-sm text-status-error"
      >
        Failed to load projects: {extractErrorMessage(error)}
      </p>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <p className="text-sm text-text-muted italic">
        No projects found. Create a project first.
      </p>
    );
  }

  return (
    <ul aria-label="Projects" role="listbox" aria-orientation="vertical">
      {projects.map((project) => {
        const isSelected = project.id === selectedId;
        return (
          <li key={project.id} role="option" aria-selected={isSelected}>
            <button
              type="button"
              onClick={() => onSelect(project.id)}
              className={[
                "w-full rounded px-3 py-2 text-left text-sm transition-colors",
                isSelected
                  ? "bg-brand-100 font-medium text-brand-700"
                  : "text-text hover:bg-surface-muted hover:text-text",
              ].join(" ")}
            >
              {project.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// ProjectSettings — root of the Project Settings tab
// ---------------------------------------------------------------------------

/**
 * Project Settings tab content.
 *
 * Shows a project selector on the left and effective settings editors on the
 * right. No project is selected by default — the user picks one first.
 */
export function ProjectSettings() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );

  return (
    <section aria-label="Project Settings">
      <p className="mb-4 text-sm text-text-secondary">
        Select a project to view its effective settings. Keys showing an
        &ldquo;Override&rdquo; badge have project-specific values that supersede
        the system defaults. Use &ldquo;Clear override&rdquo; to restore a key
        to the system default.
      </p>

      <div className="flex gap-6">
        {/* Project list */}
        <div className="w-48 shrink-0">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Projects
          </h3>
          <ProjectSelector
            selectedId={selectedProjectId}
            onSelect={setSelectedProjectId}
          />
        </div>

        {/* Effective settings for selected project */}
        <div className="flex-1 min-w-0">
          {selectedProjectId ? (
            <EffectiveSettingsPanel projectId={selectedProjectId} />
          ) : (
            <div
              aria-live="polite"
              className="flex h-40 items-center justify-center rounded-md border border-dashed border-border"
            >
              <p className="text-sm text-text-muted">
                Select a project from the list to view its settings.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
