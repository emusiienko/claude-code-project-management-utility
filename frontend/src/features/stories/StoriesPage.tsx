/**
 * StoriesPage — entry point for the /projects/:projectId route.
 *
 * Orchestrates the story list, filter bar, create/edit modal, and delete
 * confirmation dialog for stories within a single project. All server state
 * lives in TanStack Query hooks; this component handles only page-level UI
 * state (filters, which modal is open, which story is selected).
 *
 * The task aggregate column shows "N/A" — the aggregate endpoint is out of
 * scope until STORY-005.
 */

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { StoryList } from "./components/StoryList";
import { StoryModal } from "./components/StoryModal";
import { DeleteStoryDialog } from "./components/DeleteStoryDialog";
import {
  useStories,
  useCreateStory,
  useUpdateStory,
  useDeleteStory,
  type StoryFilters,
} from "./hooks/useStories";
import { useProjectDetail } from "@/features/projects/hooks/useProjects";
import { useProjectSettingsEffective } from "@/features/settings/hooks/useProjectSettings";
import type { Story } from "@/api/types";
import type { StoryFormValues } from "./components/StoryForm";
import { extractErrorMessage } from "./utils/errorMessages";

type ModalState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; story: Story }
  | { type: "delete"; story: Story };

/**
 * Stories management screen — lists stories for a project and provides
 * create/edit/delete actions plus a filter bar.
 */
export default function StoriesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const safeProjectId = projectId ?? "";

  // Filters live in page-level state and feed the list query key
  const [filters, setFilters] = useState<StoryFilters>({});
  const [draftFilters, setDraftFilters] = useState<StoryFilters>({});

  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [mutationError, setMutationError] = useState<string | undefined>();

  // Server data
  const { data: project } = useProjectDetail(safeProjectId);
  const { data: effectiveSettings } = useProjectSettingsEffective(safeProjectId);
  const { data: storiesEnvelope, isLoading, isError, error } = useStories(safeProjectId, filters);

  const statusOptions = effectiveSettings?.story_statuses ?? [];
  const stories = storiesEnvelope?.data;

  // Mutations
  const createMutation = useCreateStory();
  const updateMutation = useUpdateStory();
  const deleteMutation = useDeleteStory();

  // Modal state helpers
  function openCreate() {
    setMutationError(undefined);
    setModal({ type: "create" });
  }

  function openEdit(story: Story) {
    setMutationError(undefined);
    setModal({ type: "edit", story });
  }

  function openDelete(story: Story) {
    setMutationError(undefined);
    setModal({ type: "delete", story });
  }

  function closeModal() {
    setModal({ type: "none" });
    setMutationError(undefined);
  }

  // Submit handlers
  function handleCreateSubmit(values: StoryFormValues) {
    setMutationError(undefined);
    createMutation.mutate(
      {
        projectId: safeProjectId,
        data: {
          title: values.title,
          content: values.content || undefined,
          status: values.status || undefined,
          labels: values.labels.length > 0 ? values.labels : undefined,
        },
      },
      {
        onSuccess: () => closeModal(),
        onError: (err) => setMutationError(extractErrorMessage(err)),
      },
    );
  }

  function handleEditSubmit(values: StoryFormValues) {
    if (modal.type !== "edit") return;
    setMutationError(undefined);
    updateMutation.mutate(
      {
        storyId: modal.story.id,
        data: {
          title: values.title,
          content: values.content || undefined,
          // null explicitly clears status; empty string → send null
          status: values.status || undefined,
          labels: values.labels,
        },
      },
      {
        onSuccess: () => closeModal(),
        onError: (err) => setMutationError(extractErrorMessage(err)),
      },
    );
  }

  function handleDeleteConfirm() {
    if (modal.type !== "delete") return;
    setMutationError(undefined);
    deleteMutation.mutate(modal.story.id, {
      onSuccess: () => closeModal(),
      onError: (err) => setMutationError(extractErrorMessage(err)),
    });
  }

  // Filter bar handlers
  function applyFilters() {
    setFilters({ ...draftFilters });
  }

  function clearFilters() {
    setDraftFilters({});
    setFilters({});
  }

  const isCreateSubmitting = createMutation.isPending;
  const isEditSubmitting = updateMutation.isPending;
  const isDeleteSubmitting = deleteMutation.isPending;

  const projectName = project?.name ?? "Project";

  return (
    <div>
      {/* Breadcrumb + Page heading */}
      <div className="mb-1 text-xs text-text-muted">
        <Link to="/" className="hover:underline text-brand-600">
          Projects
        </Link>
        <span className="mx-1">/</span>
        <span className="text-text-secondary">{projectName}</span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">{projectName}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Stories within this project.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          New story
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface-muted/50 px-4 py-3">
        {/* Status filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-status" className="text-xs font-medium text-text-secondary">
            Status
          </label>
          <select
            id="filter-status"
            value={draftFilters.status ?? ""}
            onChange={(e) =>
              setDraftFilters((f) => ({
                ...f,
                status: e.target.value || undefined,
              }))
            }
            className="rounded border border-border px-2 py-1.5 text-sm text-text focus:border-brand-500 focus:outline-none"
          >
            <option value="">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Label key filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-label-key" className="text-xs font-medium text-text-secondary">
            Label key
          </label>
          <input
            id="filter-label-key"
            type="text"
            value={draftFilters.label_key ?? ""}
            onChange={(e) =>
              setDraftFilters((f) => ({
                ...f,
                label_key: e.target.value || undefined,
              }))
            }
            placeholder="e.g. env"
            className="rounded border border-border px-2 py-1.5 text-sm text-text focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Label value filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-label-value" className="text-xs font-medium text-text-secondary">
            Label value
          </label>
          <input
            id="filter-label-value"
            type="text"
            value={draftFilters.label_value ?? ""}
            onChange={(e) =>
              setDraftFilters((f) => ({
                ...f,
                label_value: e.target.value || undefined,
              }))
            }
            placeholder="e.g. production"
            className="rounded border border-border px-2 py-1.5 text-sm text-text focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Apply / Clear */}
        <div className="flex gap-2 pb-px">
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-muted"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Story list */}
      <StoryList
        stories={stories}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onEdit={openEdit}
        onDelete={openDelete}
        onNew={openCreate}
      />

      {/* Create modal */}
      {modal.type === "create" && (
        <StoryModal
          statusOptions={statusOptions}
          onSubmit={handleCreateSubmit}
          onClose={closeModal}
          isSubmitting={isCreateSubmitting}
          errorMessage={mutationError}
        />
      )}

      {/* Edit modal */}
      {modal.type === "edit" && (
        <StoryModal
          story={modal.story}
          statusOptions={statusOptions}
          onSubmit={handleEditSubmit}
          onClose={closeModal}
          isSubmitting={isEditSubmitting}
          errorMessage={mutationError}
        />
      )}

      {/* Delete confirmation */}
      {modal.type === "delete" && (
        <DeleteStoryDialog
          story={modal.story}
          onConfirm={handleDeleteConfirm}
          onClose={closeModal}
          isDeleting={isDeleteSubmitting}
          errorMessage={mutationError}
        />
      )}
    </div>
  );
}
