/**
 * BoardPage — kanban board at /projects/:projectId/board.
 *
 * Renders one column per effective story_statuses dictionary value. Columns
 * are derived from the project's effective settings, never hardcoded, so
 * the board stays consistent with the project's configured statuses.
 *
 * Drag-and-drop:
 *   - Dragging a card to a different column fires an optimistic update via
 *     useUpdateStory. The card moves immediately; a failed API call rolls back
 *     the cache to its prior state (TanStack Query onMutate / onError pattern).
 *   - Dropping on a status no longer in the effective dictionary shows an
 *     inline error on the card instead of updating.
 *
 * Clicking a card title navigates to /projects/:projectId/stories/:storyId
 * where the Story Detail slide-over renders (TASK-008).
 *
 * Columns are rendered in a horizontally-scrollable container so the board
 * stays usable regardless of sidebar state.
 */

import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateStory } from "@/features/stories/hooks/useStories";
import { useProjectSettingsEffective } from "@/features/settings/hooks/useProjectSettings";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { PAGINATION } from "@/config/apiConfig";
import { PageLoader } from "@/shared/components/PageLoader";
import { useBoardDrag } from "./hooks/useBoardDrag";
import { useBoardStories } from "./hooks/useBoardStories";
import { BoardColumn } from "./components/BoardColumn";
import { BoardCard } from "./components/BoardCard";
import type { Story, ListEnvelope } from "@/api/types";

/**
 * Board kanban view — one column per effective story status.
 * Drag cards between columns to update story status optimistically.
 */
export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const safeProjectId = projectId ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Per-card inline error messages keyed by story ID
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  // Server data
  const { data: effectiveSettings, isLoading: settingsLoading } =
    useProjectSettingsEffective(safeProjectId);
  const {
    data: storiesEnvelope,
    isLoading: storiesLoading,
    isError,
  } = useBoardStories(safeProjectId);

  // The board-specific cache key used for optimistic updates
  const boardCacheKey = CACHE_KEYS.stories.list(safeProjectId, { board: true });

  // Story status update mutation — used for optimistic update + rollback
  const updateMutation = useUpdateStory();

  const statusColumns: string[] = effectiveSettings?.story_statuses ?? [];
  const allStories: Story[] = storiesEnvelope?.data ?? [];

  /** Returns all stories belonging to a given status column. */
  function storiesForStatus(status: string): Story[] {
    return allStories.filter((s) => s.status === status);
  }

  /** Called on a valid cross-column drop — apply optimistic update then call API. */
  const handleStatusChange = useCallback(
    (storyId: string, newStatus: string) => {
      // Clear any previous error for this card
      setCardErrors((prev) => {
        const next = { ...prev };
        delete next[storyId];
        return next;
      });

      // Snapshot the previous cache state for rollback
      const previousData =
        queryClient.getQueryData<ListEnvelope<Story>>(boardCacheKey);

      // Optimistically move the card to the new column
      queryClient.setQueryData<ListEnvelope<Story>>(boardCacheKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((s) =>
            s.id === storyId ? { ...s, status: newStatus } : s,
          ),
        };
      });

      updateMutation.mutate(
        { storyId, data: { status: newStatus } },
        {
          onError: () => {
            // Restore the prior snapshot on failure
            queryClient.setQueryData(boardCacheKey, previousData);
          },
        },
      );
    },
    [safeProjectId, boardCacheKey, queryClient, updateMutation],
  );

  /** Called when a drop targets a status no longer in the effective dictionary. */
  const handleInvalidDrop = useCallback(
    (storyId: string, attemptedStatus: string) => {
      setCardErrors((prev) => ({
        ...prev,
        [storyId]: `"${attemptedStatus}" is no longer a valid status.`,
      }));
    },
    [],
  );

  const { activeStoryId, sensors, handleDragStart, handleDragEnd } =
    useBoardDrag({
      validStatuses: statusColumns,
      onStatusChange: handleStatusChange,
      onInvalidDrop: handleInvalidDrop,
    });

  // The card being dragged — rendered in the DragOverlay ghost
  const activeStory = activeStoryId
    ? allStories.find((s) => s.id === activeStoryId)
    : null;

  function handleCardClick(story: Story) {
    navigate(`/projects/${safeProjectId}/stories/${story.id}`);
  }

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------

  if (settingsLoading || storiesLoading) {
    return <PageLoader />;
  }

  if (isError) {
    return (
      <div className="p-6">
        <p
          role="alert"
          className="rounded bg-status-error/10 px-4 py-3 text-sm text-status-error"
        >
          Failed to load stories. Check your connection and refresh the page.
        </p>
      </div>
    );
  }

  if (statusColumns.length === 0) {
    return (
      <div className="p-6">
        <p
          aria-live="polite"
          className="rounded-md border border-dashed border-border p-8 text-center text-sm text-text-secondary"
        >
          No story statuses configured. Add statuses in{" "}
          <a
            href={`/projects/${safeProjectId}/settings`}
            className="text-brand-600 underline hover:text-brand-700"
          >
            Project Settings
          </a>{" "}
          to use the board.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Board canvas
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Board</h2>
        <p className="text-xs text-text-muted">
          {allStories.length}{" "}
          {allStories.length === 1 ? "story" : "stories"}
          {allStories.length >= PAGINATION.BOARD_STORIES && (
            <span className="ml-1 text-text-muted">
              (showing first {PAGINATION.BOARD_STORIES})
            </span>
          )}
        </p>
      </div>

      {/* Horizontally-scrollable board canvas — columns remain accessible
          regardless of sidebar collapsed state. The min-width on the inner
          div prevents columns from shrinking below their natural width. */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="overflow-x-auto pb-4"
          role="region"
          aria-label="Story kanban board"
        >
          <div className="flex gap-4" style={{ minWidth: "max-content" }}>
            {statusColumns.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                stories={storiesForStatus(status)}
                onCardClick={handleCardClick}
                cardErrors={cardErrors}
              />
            ))}
          </div>
        </div>

        {/* Drag overlay — ghost card that follows the pointer during drag */}
        <DragOverlay>
          {activeStory ? (
            <BoardCard
              story={activeStory}
              onClick={() => {
                /* no-op — overlay is visual only, not interactive */
              }}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
