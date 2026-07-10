/**
 * BoardColumn — a single status column in the kanban board.
 *
 * Uses `useDroppable` with id `"col-<status>"` so the parent's drag handler
 * can resolve the target status from the droppable id. Renders a vertical
 * list of SortableContext items (story cards).
 */

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Story } from "@/api/types";
import { BoardCard } from "./BoardCard";

interface BoardColumnProps {
  /** The status value this column represents — also used as the droppable id suffix. */
  status: string;
  /** All stories that belong in this column. */
  stories: Story[];
  /** Called when the user clicks a story title — navigate to the detail route. */
  onCardClick: (story: Story) => void;
  /** Per-story error messages set when an invalid drag was attempted. */
  cardErrors: Record<string, string>;
}

/** Droppable column id convention shared with useBoardDrag. */
export function columnDroppableId(status: string) {
  return `col-${status}`;
}

/**
 * A droppable kanban column for a single story status.
 *
 * The column id is prefixed with "col-" so the drag handler can distinguish
 * column droppables from individual card droppables.
 */
export function BoardColumn({ status, stories, onCardClick, cardErrors }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(status) });

  const storyIds = stories.map((s) => s.id);

  return (
    <div className="flex w-64 flex-shrink-0 flex-col gap-0">
      {/* Column header */}
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-text">{status}</h3>
        <span
          className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-secondary"
          aria-label={`${stories.length} stories`}
        >
          {stories.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={[
          "flex min-h-32 flex-col gap-2 rounded-lg border-2 p-2 transition-colors",
          isOver
            ? "border-brand-400 bg-brand-50"
            : "border-dashed border-border bg-surface-muted/30",
        ].join(" ")}
        aria-label={`${status} column — drop stories here`}
      >
        <SortableContext items={storyIds} strategy={verticalListSortingStrategy}>
          {stories.map((story) => (
            <BoardCard
              key={story.id}
              story={story}
              onClick={onCardClick}
              errorMessage={cardErrors[story.id]}
            />
          ))}
        </SortableContext>

        {stories.length === 0 && (
          <p className="flex flex-1 items-center justify-center text-xs italic text-text-muted">
            No stories
          </p>
        )}
      </div>
    </div>
  );
}
