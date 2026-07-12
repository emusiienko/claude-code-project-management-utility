/**
 * TaskCard — a draggable task card in the Task Kanban board.
 *
 * Renders inside a SortableContext column. Clicking the card title navigates
 * to the Task Detail modal (`tasks/:taskId`). An optional inline error message
 * is shown below the card when the last drag attempt was invalid.
 *
 * Cards show: title, type badge, assignee_role (when set), label chips.
 * Edit and Delete actions are revealed on hover via IconButton primitives.
 * The card injects its current status into useSortable's `data` prop so the
 * drag handler can detect same-column drops without extra lookups.
 *
 * @param task            - Task to render.
 * @param dimmed          - True when this card does not match the active filters.
 * @param onTitleClick    - Called when the user clicks the card title.
 * @param onEdit          - Called when the user clicks the Edit action.
 * @param onDelete        - Called when the user clicks the Delete action.
 * @param errorMessage    - Inline error when the last drag was rejected.
 * @param isOverlay       - True when rendering the DragOverlay ghost.
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { IconButton } from "@/shared/components/IconButton";
import type { Task } from "@/api/types";

interface TaskCardProps {
  task: Task;
  /** When true the card is dimmed — it doesn't match the active filter state. */
  dimmed?: boolean;
  /** Called when the user clicks the task title — navigate to task detail modal. */
  onTitleClick: (task: Task) => void;
  /** Called when the user clicks the Edit icon — open the edit form. */
  onEdit: (task: Task) => void;
  /** Called when the user clicks the Delete icon — open the delete confirmation. */
  onDelete: (task: Task) => void;
  /** Inline error shown when the last drag was to an invalid status. */
  errorMessage?: string;
  /**
   * When true the card renders in "overlay" mode — the ghost that follows the
   * pointer during a drag. No interactive actions, lighter opacity.
   */
  isOverlay?: boolean;
}

/**
 * A single draggable task card. Card id for dnd-kit = task.id (plain UUID).
 * Column droppable ids use "col-<status>" so there is no id collision.
 */
export function TaskCard({
  task,
  dimmed = false,
  onTitleClick,
  onEdit,
  onDelete,
  errorMessage,
  isOverlay = false,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      // Injected so the drag handler can detect same-column drops.
      status: task.status,
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
        aria-label={`Task: ${task.title}`}
        className={[
          "group relative rounded-md border border-border bg-surface p-3 shadow-sm",
          isDragging ? "opacity-40 ring-2 ring-brand-400" : "",
          isOverlay ? "rotate-1 shadow-lg" : "hover:shadow-md",
          dimmed ? "opacity-40" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Drag handle */}
        {!isOverlay && (
          <button
            type="button"
            className={[
              "absolute left-1 top-1/2 -translate-y-1/2 cursor-grab rounded p-0.5 text-text-muted",
              "opacity-0 group-hover:opacity-100 focus:opacity-100 active:cursor-grabbing",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
            ].join(" ")}
            aria-label={`Drag task: ${task.title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} aria-hidden="true" />
          </button>
        )}

        <div className="pl-4 pr-14">
          {/* Task title — clickable to open Task Detail modal */}
          <button
            type="button"
            onClick={() => onTitleClick(task)}
            className="text-left text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 rounded"
            aria-label={`Open task: ${task.title}`}
          >
            {task.title}
          </button>

          {/* Type badge */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className="inline-block rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700 border border-brand-100">
              {task.type}
            </span>

            {/* Assignee role chip */}
            {task.assignee_role && (
              <span className="inline-block rounded bg-surface-muted px-1.5 py-0.5 text-xs text-text-secondary">
                {task.assignee_role}
              </span>
            )}
          </div>

          {/* Label chips */}
          {task.labels.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {task.labels.map((label, idx) => (
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
        </div>

        {/* Hover action buttons — Edit and Delete */}
        {!isOverlay && (
          <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
            <IconButton
              Icon={Pencil}
              label={`Edit task: ${task.title}`}
              intent="neutral"
              onClick={() => onEdit(task)}
            />
            <IconButton
              Icon={Trash2}
              label={`Delete task: ${task.title}`}
              intent="destructive"
              onClick={() => onDelete(task)}
            />
          </div>
        )}
      </article>

      {/* Inline error — shown when the last drag was to an invalid status */}
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
