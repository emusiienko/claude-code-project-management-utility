/**
 * StorySlideOver — Story Detail slide-over panel rendered as a nested child
 * route at /projects/:projectId/stories/:storyId.
 *
 * The panel animates in from the right over the background Stories list (which
 * stays mounted and dimmed). Closing navigates back to the parent stories route.
 *
 * Layout:
 *   - Fixed header: breadcrumb, title, status badge, Edit button, close button
 *   - Main scrollable area: task kanban placeholder (STORY-005)
 *   - Collapsible right panel: description (Markdown), attachments placeholder,
 *     comments placeholder; open/closed state persisted per story in localStorage
 *
 * Deep-link: visiting the URL directly renders the slide-over over the list.
 * Non-existent storyId: renders an inline "Not found" message.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, ChevronLeft, Pencil } from "lucide-react";
import { useStory, useUpdateStory } from "../hooks/useStories";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";
import { useProjectSettingsEffective } from "@/features/settings/hooks/useProjectSettings";
import { TaskKanbanPlaceholder } from "./TaskKanbanPlaceholder";
import { StoryRightPanel } from "./StoryRightPanel";
import { StoryModal } from "./StoryModal";
import type { Story } from "@/api/types";
import type { StoryFormValues } from "./StoryForm";
import { extractErrorMessage } from "../utils/errorMessages";

/** localStorage key prefix for per-story right-panel state. */
const PANEL_KEY_PREFIX = "story:panel:";

interface EditModalState {
  open: boolean;
  story: Story | null;
}

/**
 * Story Detail slide-over. Mounts as the :storyId child route inside StoriesPage.
 * Animates in from the right; dimmed backdrop covers the background list.
 */
export function StorySlideOver() {
  const { projectId = "", storyId = "" } = useParams<{
    projectId: string;
    storyId: string;
  }>();
  const navigate = useNavigate();

  // Right-panel open/closed state persisted per story in localStorage
  const panelKey = `${PANEL_KEY_PREFIX}${storyId}`;
  const [isPanelOpen, setIsPanelOpen] = useLocalStorage<boolean>(panelKey, true);

  // Edit modal state
  const [editModal, setEditModal] = useState<EditModalState>({
    open: false,
    story: null,
  });
  const [mutationError, setMutationError] = useState<string | undefined>();

  // Queries
  const { data: story, isLoading, isError } = useStory(storyId);
  const { data: effectiveSettings } = useProjectSettingsEffective(projectId);
  const updateMutation = useUpdateStory();

  const storyStatusOptions = effectiveSettings?.story_statuses ?? [];
  const taskStatusOptions = effectiveSettings?.task_statuses ?? [];

  // Close navigates back to the parent stories list
  const handleClose = useCallback(() => {
    navigate(`/projects/${projectId}/stories`);
  }, [navigate, projectId]);

  // Escape key closes the slide-over
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  // Edit modal handlers
  function openEdit(s: Story) {
    setMutationError(undefined);
    setEditModal({ open: true, story: s });
  }

  function closeEdit() {
    setEditModal({ open: false, story: null });
    setMutationError(undefined);
  }

  function handleEditSubmit(values: StoryFormValues) {
    if (!editModal.story) return;
    setMutationError(undefined);
    updateMutation.mutate(
      {
        storyId: editModal.story.id,
        data: {
          title: values.title,
          content: values.content || undefined,
          status: values.status || undefined,
          labels: values.labels,
        },
      },
      {
        onSuccess: () => closeEdit(),
        onError: (err) => setMutationError(extractErrorMessage(err)),
      },
    );
  }

  return (
    <>
      {/* Dimmed backdrop — click to close */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        onClick={handleClose}
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={story?.title ?? "Story detail"}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-4xl flex-col bg-surface shadow-2xl animate-slide-in-from-right"
      >
        {/* ------------------------------------------------------------------ */}
        {/* Fixed header                                                         */}
        {/* ------------------------------------------------------------------ */}
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-3">
          {/* Breadcrumb — returns to stories list */}
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1 rounded text-sm text-text-secondary hover:text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            aria-label="Back to Stories list"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span>Stories</span>
          </button>

          <span className="text-text-muted" aria-hidden="true">/</span>

          {/* Story title */}
          <div className="min-w-0 flex-1">
            {isLoading ? (
              <div
                className="h-5 w-48 animate-pulse rounded bg-surface-muted"
                aria-busy="true"
              />
            ) : story ? (
              <h2 className="truncate text-base font-semibold text-text">
                {story.title}
              </h2>
            ) : null}
          </div>

          {/* Status badge */}
          {story?.status && (
            <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              {story.status}
            </span>
          )}

          {/* Edit button */}
          {story && (
            <button
              type="button"
              onClick={() => openEdit(story)}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              aria-label={`Edit story: ${story.title}`}
            >
              <Pencil size={14} aria-hidden="true" />
              <span>Edit</span>
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded p-1.5 text-text-secondary hover:bg-surface-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            aria-label="Close story detail"
            title="Close story detail"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {/* ------------------------------------------------------------------ */}
        {/* Body                                                                  */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Loading state */}
          {isLoading && (
            <div
              className="flex flex-1 items-center justify-center"
              aria-busy="true"
            >
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          )}

          {/* Error / not found state */}
          {!isLoading && (isError || !story) && (
            <div
              role="alert"
              className="flex flex-1 flex-col items-center justify-center gap-3 p-8"
            >
              <p className="text-sm font-medium text-text-secondary">
                Story not found
              </p>
              <p className="text-xs text-text-muted">
                This story may have been deleted or the URL is incorrect.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-2 rounded-md border border-border px-4 py-2 text-sm text-text hover:bg-surface-muted"
              >
                Back to Stories
              </button>
            </div>
          )}

          {/* Main content — only when story loaded */}
          {!isLoading && story && (
            <>
              {/* Main scrollable area: task kanban placeholder */}
              <main className="min-w-0 flex-1 overflow-y-auto p-6">
                <TaskKanbanPlaceholder
                  statusOptions={taskStatusOptions}
                  storyId={story.id}
                />
              </main>

              {/* Collapsible right panel */}
              <StoryRightPanel
                story={story}
                isOpen={isPanelOpen}
                onToggle={() => setIsPanelOpen((prev) => !prev)}
              />
            </>
          )}
        </div>
      </div>

      {/* Edit modal — opened from the slide-over header */}
      {editModal.open && editModal.story && (
        <StoryModal
          story={editModal.story}
          statusOptions={storyStatusOptions}
          onSubmit={handleEditSubmit}
          onClose={closeEdit}
          isSubmitting={updateMutation.isPending}
          errorMessage={mutationError}
        />
      )}
    </>
  );
}
