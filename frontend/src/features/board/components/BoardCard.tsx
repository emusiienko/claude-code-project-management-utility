/**
 * BoardCard — a draggable story card in the kanban board.
 *
 * Renders inside a SortableContext column. Clicking the card title navigates
 * to the Story Detail slide-over. An optional inline error message is shown
 * below the card when the last drag attempt was invalid (target status not
 * in the effective dictionary).
 *
 * The card injects its current status into useSortable's `data` prop so the
 * drag handler can detect same-column drops without extra lookups.
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, AlertCircle } from "lucide-react";
import type { Story } from "@/api/types";

interface BoardCardProps {
  story: Story;
  /** Called when the user clicks the card title — opens the story detail slide-over. */
  onClick: (story: Story) => void;
  /** Inline error shown when the last drag to this card was rejected. */
  errorMessage?: string;
  /**
   * When true the card renders in "overlay" mode — the visual ghost that
   * follows the pointer during a drag. No drag handles, lighter opacity.
   */
  isOverlay?: boolean;
}

/**
 * A single draggable story card.
 *
 * Card id for dnd-kit = story.id (plain UUID). The column uses "col-<status>" ids
 * so there is no collision with card ids.
 */
export function BoardCard({ story, onClick, errorMessage, isOverlay = false }: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: story.id,
    data: {
      // Injected so useBoardDrag.handleDragEnd can detect same-column drops.
      status: story.status,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div className="flex flex-col gap-1">
      <article
        ref={setNodeRef}
        style={style}
        aria-label={`Story: ${story.title}`}
        className={[
          "group relative rounded-md border border-border bg-surface p-3 shadow-sm",
          isDragging ? "opacity-40 ring-2 ring-brand-400" : "",
          isOverlay ? "rotate-1 shadow-lg" : "hover:shadow-md",
        ].join(" ")}
      >
        {/* Drag handle */}
        <button
          type="button"
          className={[
            "absolute left-1 top-1/2 -translate-y-1/2 cursor-grab rounded p-0.5 text-text-muted",
            "opacity-0 group-hover:opacity-100 focus:opacity-100 active:cursor-grabbing",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          ].join(" ")}
          aria-label={`Drag story: ${story.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} aria-hidden="true" />
        </button>

        <div className="pl-4">
          {/* Story title — clickable to open detail slide-over */}
          <button
            type="button"
            onClick={() => onClick(story)}
            className="text-left text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 rounded"
            aria-label={`Open story: ${story.title}`}
          >
            {story.title}
          </button>

          {/* Labels */}
          {story.labels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {story.labels.map((label, idx) => (
                <span
                  key={`${label.key}-${idx}`}
                  className="inline-block rounded bg-surface-muted px-1.5 py-0.5 text-xs text-text-secondary"
                >
                  <span className="font-medium text-text">{label.key}</span>
                  {label.value && (
                    <>
                      <span className="text-text-muted">:</span>
                      <span>{label.value}</span>
                    </>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Task aggregate — N/A until STORY-005 */}
          <p className="mt-2 text-xs text-text-muted" data-testid="task-aggregate">
            Tasks: N/A
          </p>
        </div>
      </article>

      {/* Inline error — shown when the last drag attempt was to an invalid status */}
      {errorMessage && (
        <p
          role="alert"
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-status-error bg-status-error/10"
        >
          <AlertCircle size={12} aria-hidden="true" />
          {errorMessage}
        </p>
      )}
    </div>
  );
}
