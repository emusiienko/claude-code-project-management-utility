/**
 * StoriesPage — Stories tab content at /projects/:projectId/stories.
 *
 * Orchestrates the story list, filter bar, create/edit modal, and delete
 * confirmation dialog for stories within a single project. All server state
 * lives in TanStack Query hooks; this component handles only page-level UI
 * state (filters, which modal is open, which story is selected).
 *
 * On mount, records the active project ID to localStorage so RootRedirect
 * returns to this project on the next visit.
 *
 * Clicking a story title navigates to /projects/:projectId/stories/:storyId
 * where TASK-008's slide-over will render.
 *
 * The task aggregate column shows "N/A" — the aggregate endpoint is out of
 * scope until STORY-005.
 */

import { useState, useEffect } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { useParams, useNavigate, Outlet } from "react-router-dom";
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
import { useProjectSettingsEffective } from "@/features/settings/hooks/useProjectSettings";
import { useProjectMilestones } from "@/features/milestones/hooks/useMilestones";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";
import { LAST_PROJECT_KEY } from "@/app/RootRedirect";
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
  const navigate = useNavigate();

  // Record this project as last visited so RootRedirect returns here.
  const [, setLastProjectId] = useLocalStorage<string | null>(LAST_PROJECT_KEY, null);
  useEffect(() => {
    if (safeProjectId) {
      setLastProjectId(safeProjectId);
    }
  // Run only when the projectId changes, not on every setLastProjectId reference change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeProjectId]);

  // Filters live in page-level state and feed the list query key
  const [filters, setFilters] = useState<StoryFilters>({});
  const [draftFilters, setDraftFilters] = useState<StoryFilters>({});

  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [mutationError, setMutationError] = useState<string | undefined>();

  // Server data
  const { data: effectiveSettings } = useProjectSettingsEffective(safeProjectId);
  const { data: milestonesEnvelope } = useProjectMilestones(safeProjectId);
  const { data: storiesEnvelope, isLoading, isError, error } = useStories(safeProjectId, filters);

  const statusOptions = effectiveSettings?.story_statuses ?? [];
  const milestoneOptions = milestonesEnvelope?.data ?? [];
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
          milestone_id: values.milestone_id ?? undefined,
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
          // null explicitly clears milestone assignment
          milestone_id: values.milestone_id,
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

  // Title click — navigate to story detail slide-over (rendered in TASK-008)
  function handleTitleClick(story: Story) {
    navigate(`/projects/${safeProjectId}/stories/${story.id}`);
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

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Stories</h2>
        <button
          type="button"
          onClick={openCreate}
          aria-label="New story"
          title="New story"
          className="inline-flex items-center justify-center rounded-md bg-brand-600 p-2 text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface-muted/50 px-4 py-3">
        {/* Status filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-status" className="text-xs font-medium text-text-secondary">
            Status
          </label>
          <div className="relative inline-block">
            <select
              id="filter-status"
              value={draftFilters.status ?? ""}
              onChange={(e) =>
                setDraftFilters((f) => ({
                  ...f,
                  status: e.target.value || undefined,
                }))
              }
              className="w-auto appearance-none rounded border border-border pl-2 pr-8 py-1.5 text-sm text-text focus:border-brand-500 focus:outline-none"
            >
              <option value="">All statuses</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
          </div>
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
        onTitleClick={handleTitleClick}
      />

      {/* Create modal */}
      {modal.type === "create" && (
        <StoryModal
          statusOptions={statusOptions}
          milestoneOptions={milestoneOptions}
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
          milestoneOptions={milestoneOptions}
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

      {/* Story detail slide-over — rendered by the :storyId child route (TASK-008).
          The Outlet keeps the list mounted in the background while the slide-over is active. */}
      <Outlet />
    </div>
  );
}
