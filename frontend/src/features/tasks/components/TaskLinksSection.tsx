/**
 * TaskLinksSection — the full Links section inside the Task Detail Modal.
 *
 * Renders the enriched list of outbound and inbound task links, an "Add link"
 * toggle that reveals AddTaskLinkForm, and per-row delete with confirmation
 * via DeleteTaskLinkDialog.
 *
 * Reads link_types from the already-cached effective project settings (no
 * extra network call). Reads the task list for the same story from the
 * already-cached tasks query so the target-task selector is populated without
 * an extra request.
 *
 * @param taskId    - The task whose links are displayed and managed.
 * @param storyId   - Owning story — scopes the task list query.
 * @param projectId - Owning project — used for settings + navigation URLs.
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTaskLinkList, useCreateTaskLink, useDeleteTaskLink } from "@/features/task-links/hooks/useTaskLinks";
import { useTaskList } from "@/features/tasks/hooks/useTasks";
import { useProjectSettingsEffective } from "@/features/settings/hooks/useProjectSettings";
import { getLinkOptions } from "@/shared/utils/linkLabels";
import { TaskLinkRow } from "./TaskLinkRow";
import { AddTaskLinkForm } from "./AddTaskLinkForm";
import { DeleteTaskLinkDialog } from "./DeleteTaskLinkDialog";
import { extractErrorMessage, extractFieldErrors } from "../utils/errorMessages";
import type { EnrichedTaskLink } from "@/api/types";
import type { Direction } from "@/shared/utils/linkLabels";

interface TaskLinksSectionProps {
  taskId: string;
  storyId: string;
  projectId: string;
}

/** Orchestrates the full task-links UI: list, add form, and delete confirmation. */
export function TaskLinksSection({
  taskId,
  storyId,
  projectId,
}: TaskLinksSectionProps) {
  // Link list query — "both" direction returns outbound + inbound in one call
  const {
    data: linkEnvelope,
    isLoading: isLoadingLinks,
    isError: isLinksError,
  } = useTaskLinkList(taskId, { direction: "both" });

  // Task list — reuses the existing story-scoped cache; no extra network call
  const { data: taskEnvelope } = useTaskList(storyId);

  // Effective settings — already in-cache from TaskDetailModal; no extra network call
  const { data: effectiveSettings } = useProjectSettingsEffective(projectId);
  const linkTypeEntries = effectiveSettings?.link_types ?? [];
  const linkTypeOptions = getLinkOptions(linkTypeEntries);

  // Mutations
  const createMutation = useCreateTaskLink(taskId);
  const deleteMutation = useDeleteTaskLink(taskId);

  // Local UI state
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [addError, setAddError] = useState<string | undefined>();
  const [addFieldErrors, setAddFieldErrors] = useState<Record<string, string>>(
    {},
  );
  const [pendingDelete, setPendingDelete] = useState<
    EnrichedTaskLink | undefined
  >();
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const links = linkEnvelope?.data ?? [];
  const tasks = taskEnvelope?.data ?? [];

  function handleAddSubmit(values: {
    target_task_id: string;
    link_type: string;
    direction: Direction;
  }) {
    setAddError(undefined);
    setAddFieldErrors({});
    // Inbound direction: the selected task is the source, the current task is the target.
    const mutationData =
      values.direction === "inbound"
        ? {
            sourceTaskId: values.target_task_id,
            target_task_id: taskId,
            link_type: values.link_type,
          }
        : { target_task_id: values.target_task_id, link_type: values.link_type };
    createMutation.mutate(mutationData, {
      onSuccess: () => {
        setIsAddingLink(false);
        setAddError(undefined);
        setAddFieldErrors({});
      },
      onError: (err) => {
        setAddError(extractErrorMessage(err));
        setAddFieldErrors(extractFieldErrors(err));
      },
    });
  }

  function handleDeleteConfirm() {
    if (!pendingDelete) return;
    setDeleteError(undefined);
    deleteMutation.mutate(pendingDelete.id, {
      onSuccess: () => {
        setPendingDelete(undefined);
        setDeleteError(undefined);
      },
      onError: (err) => {
        setDeleteError(extractErrorMessage(err));
      },
    });
  }

  return (
    <section aria-label="Task links">
      {/* Section header with "Add link" button */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Links
        </h3>
        {!isAddingLink && (
          <button
            type="button"
            onClick={() => {
              setIsAddingLink(true);
              setAddError(undefined);
              setAddFieldErrors({});
            }}
            className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            aria-label="Add task link"
          >
            <Plus size={13} aria-hidden="true" />
            <span>Add link</span>
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoadingLinks && (
        <div
          className="flex items-center justify-center py-6"
          aria-busy="true"
        >
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {!isLoadingLinks && isLinksError && (
        <p
          role="alert"
          className="rounded-md bg-status-error/10 px-4 py-3 text-sm text-status-error"
        >
          Failed to load links. Please refresh and try again.
        </p>
      )}

      {/* Empty state */}
      {!isLoadingLinks && !isLinksError && links.length === 0 && !isAddingLink && (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-text-muted">
          No links yet.
        </p>
      )}

      {/* Link list */}
      {!isLoadingLinks && !isLinksError && links.length > 0 && (
        <ul
          aria-label="Task links list"
          className="divide-y divide-border rounded-md border border-border"
        >
          {links.map((link) => (
            <TaskLinkRow
              key={link.id}
              link={link}
              projectId={projectId}
              storyId={storyId}
              linkTypeEntries={linkTypeEntries}
              onDelete={(l) => {
                setPendingDelete(l);
                setDeleteError(undefined);
              }}
            />
          ))}
        </ul>
      )}

      {/* Add link form */}
      {isAddingLink && (
        <AddTaskLinkForm
          currentTaskId={taskId}
          linkTypeOptions={linkTypeOptions}
          tasks={tasks}
          onSubmit={handleAddSubmit}
          onCancel={() => {
            setIsAddingLink(false);
            setAddError(undefined);
            setAddFieldErrors({});
          }}
          isSubmitting={createMutation.isPending}
          errorMessage={addError}
          fieldErrors={addFieldErrors}
        />
      )}

      {/* Delete confirmation dialog */}
      {pendingDelete && (
        <DeleteTaskLinkDialog
          linkedTaskTitle={pendingDelete.linked_task.title}
          linkType={pendingDelete.link_type}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setPendingDelete(undefined);
            setDeleteError(undefined);
          }}
          isDeleting={deleteMutation.isPending}
          errorMessage={deleteError}
        />
      )}
    </section>
  );
}
