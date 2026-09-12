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
 *   - A draggable separator between the kanban and the right panel while it is
 *     expanded (STORY-006 TASK-011) — its resized width is shared across every
 *     story under one `useResizablePanel` storage key, not scoped per story
 *
 * Deep-link: visiting the URL directly renders the slide-over over the list.
 * Non-existent storyId: renders an inline "Not found" message.
 *
 * Escape closes only this slide-over, and only when it is topmost — the
 * shared `useModalEscape` stack lets the Task Detail Modal or an attachment
 * viewer mounted on top of it take precedence instead.
 *
 * The backdrop and panel start below the global top bar (`top-12`, matching
 * its `h-12` height) rather than at the true viewport top (`inset-0`/
 * `inset-y-0`) — otherwise both fully cover it, making the global Projects
 * entry unclickable while this is open (BUG-004). The top bar itself sits
 * above both at z-[110], so this offset also prevents this panel's own
 * header from being visually clipped by the top bar.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Outlet } from "react-router-dom";
import { X, ChevronLeft, Pencil } from "lucide-react";
import { useStory, useUpdateStory } from "../hooks/useStories";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";
import { useModalEscape } from "@/shared/hooks/useModalEscape";
import { useProjectSettingsEffective } from "@/features/settings/hooks/useProjectSettings";
import { useProjectMilestones } from "@/features/milestones/hooks/useMilestones";
import { TaskKanban } from "@/features/tasks/components/TaskKanban";
import { StoryRightPanel } from "./StoryRightPanel";
import { StoryModal } from "./StoryModal";
import { ResizeHandle } from "@/shared/components/ResizeHandle";
import { useResizablePanel } from "@/shared/hooks/useResizablePanel";
import type { Story } from "@/api/types";
import type { StoryFormValues } from "./StoryForm";
import { extractErrorMessage } from "../utils/errorMessages";

/** localStorage key prefix for per-story right-panel state. */
const PANEL_KEY_PREFIX = "story:panel:";

/**
 * Storage key the right panel's resized width is committed under (STORY-006
 * TASK-011) — a single key for the whole surface, not one per story: the
 * panel/kanban split's width belongs to the panel pair, unlike the panel's
 * open/closed state which stays keyed per story above.
 */
const RIGHT_PANEL_WIDTH_STORAGE_KEY = "story-slide-over:right-panel-width";
/** DOM id the separator's aria-controls targets. */
const RIGHT_PANEL_ID = "story-slide-over-right-panel";
const RIGHT_PANEL_DEFAULT_WIDTH = 320;
const RIGHT_PANEL_MIN_WIDTH = 280;
const RIGHT_PANEL_MAX_WIDTH = 560;
const KANBAN_MIN_WIDTH = 400;

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
  const location = useLocation();

  // Set by the comment permalink resolver (TASK-009) when it navigates here —
  // forces the right panel open (comments live inside it) and requests a
  // scroll-to + highlight once CommentsSection's thread has loaded.
  const scrollToCommentId = (location.state as { scrollToCommentId?: string } | null)
    ?.scrollToCommentId;

  // Right-panel open/closed state persisted per story in localStorage
  const panelKey = `${PANEL_KEY_PREFIX}${storyId}`;
  const [isPanelOpen, setIsPanelOpen] = useLocalStorage<boolean>(panelKey, true);

  // A deep-linked comment lives inside the (possibly collapsed) right panel — force it open.
  useEffect(() => {
    if (scrollToCommentId && !isPanelOpen) setIsPanelOpen(true);
  }, [scrollToCommentId, isPanelOpen, setIsPanelOpen]);

  // Draggable split between the kanban <main> and the right panel (STORY-006 TASK-011).
  const {
    containerRef,
    width: rightPanelWidth,
    maxWidth: rightPanelMaxWidth,
    resizeToPointer,
    resizeBy,
    resizeTo,
  } = useResizablePanel({
    storageKey: RIGHT_PANEL_WIDTH_STORAGE_KEY,
    defaultWidth: RIGHT_PANEL_DEFAULT_WIDTH,
    minWidth: RIGHT_PANEL_MIN_WIDTH,
    maxWidth: RIGHT_PANEL_MAX_WIDTH,
    neighbourMinWidth: KANBAN_MIN_WIDTH,
    side: "right",
  });

  // Edit modal state
  const [editModal, setEditModal] = useState<EditModalState>({
    open: false,
    story: null,
  });
  const [mutationError, setMutationError] = useState<string | undefined>();

  // Queries
  const { data: story, isLoading, isError } = useStory(storyId);
  const { data: effectiveSettings } = useProjectSettingsEffective(projectId);
  const { data: milestonesEnvelope } = useProjectMilestones(projectId);
  const updateMutation = useUpdateStory();

  const storyStatusOptions = effectiveSettings?.story_statuses ?? [];
  const taskStatusOptions = effectiveSettings?.task_statuses ?? [];
  const taskTypeOptions = effectiveSettings?.task_types ?? [];
  const participantRoleOptions = effectiveSettings?.participant_roles ?? [];
  const linkTypeEntries = effectiveSettings?.link_types ?? [];
  const milestoneOptions = milestonesEnvelope?.data ?? [];

  // Close navigates back to the parent stories list
  const handleClose = useCallback(() => {
    navigate(`/projects/${projectId}/stories`);
  }, [navigate, projectId]);

  useModalEscape(handleClose);

  // Milestone assignment — updates only milestone_id, no other fields touched
  function handleMilestoneAssign(milestoneId: string | null) {
    if (!story) return;
    updateMutation.mutate(
      { storyId: story.id, data: { milestone_id: milestoneId } },
      {
        onError: (err) => setMutationError(extractErrorMessage(err)),
      },
    );
  }

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
          // null explicitly clears milestone assignment
          milestone_id: values.milestone_id,
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
        className="fixed inset-x-0 bottom-0 top-12 z-40 bg-black/40"
        aria-hidden="true"
        onClick={handleClose}
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={story?.title ?? "Story detail"}
        className="fixed bottom-0 right-0 top-12 z-50 flex w-[90vw] flex-col bg-surface shadow-2xl animate-slide-in-from-right"
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
        <div ref={containerRef} className="flex min-h-0 flex-1 overflow-hidden">
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
              {/* Main scrollable area: task kanban */}
              <main className="min-w-0 flex-1 overflow-y-auto p-6">
                <TaskKanban
                  storyId={story.id}
                  projectId={projectId}
                  taskStatuses={taskStatusOptions}
                  taskTypes={taskTypeOptions}
                  roleOptions={participantRoleOptions}
                />
              </main>

              {/* Draggable split — only while the right panel is expanded */}
              {isPanelOpen && (
                <ResizeHandle
                  ariaLabel="Resize story details panel"
                  controlsId={RIGHT_PANEL_ID}
                  width={rightPanelWidth ?? RIGHT_PANEL_DEFAULT_WIDTH}
                  min={RIGHT_PANEL_MIN_WIDTH}
                  max={rightPanelMaxWidth}
                  side="right"
                  onResizeToPointer={resizeToPointer}
                  onResizeBy={resizeBy}
                  onResizeTo={resizeTo}
                />
              )}

              {/* Collapsible right panel */}
              <StoryRightPanel
                id={RIGHT_PANEL_ID}
                width={rightPanelWidth}
                story={story}
                isOpen={isPanelOpen}
                onToggle={() => setIsPanelOpen((prev) => !prev)}
                onMilestoneAssign={handleMilestoneAssign}
                isMilestoneUpdatePending={updateMutation.isPending}
                linkTypeEntries={linkTypeEntries}
                scrollToCommentId={scrollToCommentId}
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
          milestoneOptions={milestoneOptions}
          onSubmit={handleEditSubmit}
          onClose={closeEdit}
          isSubmitting={updateMutation.isPending}
          errorMessage={mutationError}
        />
      )}

      {/*
       * Task Detail modal mount point — renders the tasks/:taskId child route
       * on top of the slide-over panel. The Outlet is empty when no task route
       * is active; the TaskDetailModal component provides its own backdrop and
       * panel so the slide-over behind stays dimmed but mounted.
       */}
      <Outlet />
    </>
  );
}
