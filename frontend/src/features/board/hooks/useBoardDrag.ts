/**
 * useBoardDrag (Board re-export)
 *
 * The canonical implementation lives in src/shared/hooks/useBoardDrag.ts.
 * This file re-exports it so the Board feature can import locally, and
 * adds a backward-compat `BoardDragHandlers` alias that maps `activeItemId`
 * → `activeStoryId` so the existing BoardPage and its tests do not break.
 */

import { useBoardDrag as useSharedBoardDrag, resolveTargetStatus } from "@/shared/hooks/useBoardDrag";
import type { KanbanDragHandlers } from "@/shared/hooks/useBoardDrag";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useSensors } from "@dnd-kit/core";

export { resolveTargetStatus };

/** Board-specific alias of KanbanDragHandlers — uses `activeStoryId` instead of `activeItemId`. */
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
  validStatuses: string[];
  onStatusChange: (storyId: string, newStatus: string) => void;
  onInvalidDrop: (storyId: string, attemptedStatus: string) => void;
}

/**
 * useBoardDrag — board-scoped wrapper around the shared kanban-drag hook.
 *
 * Exposes `activeStoryId` (alias of `activeItemId`) so the Board and its
 * existing tests remain unchanged.
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
  const shared: KanbanDragHandlers = useSharedBoardDrag({
    validStatuses,
    onStatusChange,
    onInvalidDrop,
  });

  return {
    activeStoryId: shared.activeItemId,
    sensors: shared.sensors,
    handleDragStart: shared.handleDragStart,
    handleDragEnd: shared.handleDragEnd,
  };
}
