/**
 * useBoardDrag — drag-and-drop state and handlers for the kanban board.
 *
 * Encapsulates all dnd-kit wiring: sensors, active card tracking, and
 * the onDragEnd handler that fires optimistic status updates. The hook
 * does NOT call the API directly — it delegates to the `onStatusChange`
 * callback so the caller (BoardPage) owns the mutation lifecycle.
 *
 * Design notes:
 * - `activeStoryId` is set on dragStart and cleared on dragEnd; used by
 *   the DragOverlay so the dragged card keeps rendering during the flight.
 * - Drops on the same column are silently ignored (no-op).
 * - Drops on an unknown status are rejected via `onInvalidDrop`.
 */

import { useState, useCallback } from "react";
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

export interface BoardDragHandlers {
  /** Active dragged story ID — null when no drag is in progress. */
  activeStoryId: string | null;
  /** Configured dnd-kit sensors (pointer + keyboard). */
  sensors: ReturnType<typeof useSensors>;
  /** Called by DndContext's onDragStart. */
  handleDragStart: (event: DragStartEvent) => void;
  /** Called by DndContext's onDragEnd. */
  handleDragEnd: (event: DragEndEvent) => void;
}

interface UseBoardDragOptions {
  /** Valid status values from the effective dictionary; used to guard invalid drops. */
  validStatuses: string[];
  /**
   * Called when the user drops a card on a different, valid column.
   * The caller is responsible for the optimistic update + API call.
   */
  onStatusChange: (storyId: string, newStatus: string) => void;
  /**
   * Called when the user drops a card on a status that is no longer in
   * the effective dictionary. The caller should show an inline error.
   */
  onInvalidDrop: (storyId: string, attemptedStatus: string) => void;
}

/**
 * useBoardDrag
 *
 * Returns the sensors, active-card state, and event handlers needed to wire
 * up a `DndContext` for the kanban board.
 *
 * @param options.validStatuses  - Current effective story_statuses list.
 * @param options.onStatusChange - Fired on a valid cross-column drop.
 * @param options.onInvalidDrop  - Fired when the target status is not in validStatuses.
 */
export function useBoardDrag({
  validStatuses,
  onStatusChange,
  onInvalidDrop,
}: UseBoardDragOptions): BoardDragHandlers {
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a 5 px displacement before activating so click handlers fire normally.
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveStoryId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveStoryId(null);

      const { active, over } = event;

      // No valid drop target — user released outside a column
      if (!over) return;

      const storyId = String(active.id);

      // Resolve the target status.
      // Primary: over.id is "col-<status>" (column droppable).
      // Fallback: over.id is a story UUID — read status from over.data.current.status
      //   (injected by useSortable's data prop in BoardCard).
      const overId = String(over.id);
      let targetStatus = resolveTargetStatus(overId);
      if (targetStatus === null) {
        // Dropped on another card — use that card's status as the column target
        const overCardStatus = over.data.current?.status as string | undefined;
        targetStatus = overCardStatus ?? null;
      }

      // Still no target — e.g. dropped on an unknown element
      if (targetStatus === null) return;

      // Determine source status from active.data (injected by useSortable data prop in BoardCard)
      const sourceStatus = active.data.current?.status as string | undefined;

      // Same column — nothing to do
      if (sourceStatus === targetStatus) return;

      // Guard: target status must still be in the effective dictionary
      if (!validStatuses.includes(targetStatus)) {
        onInvalidDrop(storyId, targetStatus);
        return;
      }

      onStatusChange(storyId, targetStatus);
    },
    [validStatuses, onStatusChange, onInvalidDrop],
  );

  return { activeStoryId, sensors, handleDragStart, handleDragEnd };
}

/**
 * Resolves the target status string from a droppable `over.id`.
 *
 * Column droppable ids are prefixed with "col-" so they do not clash with
 * story card ids. Returns null when the over id is not a column droppable id —
 * the caller falls back to reading `over.data.current.status` in that case.
 */
export function resolveTargetStatus(overId: string): string | null {
  const COL_PREFIX = "col-";
  if (overId.startsWith(COL_PREFIX)) {
    return overId.slice(COL_PREFIX.length);
  }
  return null;
}
