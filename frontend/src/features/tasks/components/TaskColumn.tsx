/**
 * TaskColumn — a single status column in the Task Kanban board.
 *
 * Uses `useDroppable` with id `"col-<status>"` so the parent's drag handler
 * can resolve the target status. Renders task cards in a SortableContext,
 * and an "Add task" button at the bottom of the column.
 *
 * @param status       - The status value this column represents.
 * @param tasks        - All tasks that belong in this column.
 * @param dimmedIds    - Set of task IDs to dim (filtered out by the filter bar).
 * @param cardErrors   - Per-task error messages from invalid drag attempts.
 * @param onTitleClick - Called when the user clicks a task title.
 * @param onEdit       - Called when the user clicks a task's Edit button.
 * @param onDelete     - Called when the user clicks a task's Delete button.
 * @param onAddTask    - Called when the user clicks "Add task" — passes the column status.
 */

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Task } from "@/api/types";
import { TaskCard } from "./TaskCard";

interface TaskColumnProps {
  /** The status value this column represents — also the droppable id suffix. */
  status: string;
  /** All tasks that belong in this column (ordered by created_at ASC). */
  tasks: Task[];
  /** IDs of tasks that are currently dimmed by the filter bar. */
  dimmedIds: Set<string>;
  /** Per-task inline error messages from invalid drag attempts. */
  cardErrors: Record<string, string>;
  /** Called when the user clicks a task's title — opens the task detail modal. */
  onTitleClick: (task: Task) => void;
  /** Called when the user activates the Edit action on a card. */
  onEdit: (task: Task) => void;
  /** Called when the user activates the Delete action on a card. */
  onDelete: (task: Task) => void;
  /** Called when the user clicks "Add task" — passes the column status to pre-fill the form. */
  onAddTask: (status: string) => void;
}

/** Droppable column id convention shared with useBoardDrag. */
export function columnDroppableId(status: string) {
  return `col-${status}`;
}

/**
 * A droppable kanban column for a single task status.
 * Column ids use the "col-" prefix so the drag handler can distinguish them
 * from card ids.
 */
export function TaskColumn({
  status,
  tasks,
  dimmedIds,
  cardErrors,
  onTitleClick,
  onEdit,
  onDelete,
  onAddTask,
}: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(status) });
  const taskIds = tasks.map((t) => t.id);

  return (
    <div className="flex min-w-40 flex-1 flex-col gap-0">
      {/* Column header */}
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-text">{status}</h3>
        <span
          className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-secondary"
          aria-label={`${tasks.length} tasks`}
        >
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={[
          "flex flex-1 flex-col gap-2 rounded-lg border-2 p-2 transition-colors",
          isOver
            ? "border-brand-400 bg-brand-50"
            : "border-dashed border-border bg-surface-muted/30",
        ].join(" ")}
        aria-label={`${status} column — drop tasks here`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              dimmed={dimmedIds.has(task.id)}
              onTitleClick={onTitleClick}
              onEdit={onEdit}
              onDelete={onDelete}
              errorMessage={cardErrors[task.id]}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <p className="flex flex-1 items-center justify-center text-xs italic text-text-muted min-h-16">
            No tasks
          </p>
        )}
      </div>

      {/* Add task footer */}
      <button
        type="button"
        onClick={() => onAddTask(status)}
        className="mt-1.5 flex w-full items-center justify-center gap-1 rounded border border-dashed border-border py-1.5 text-xs text-text-secondary hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors"
        aria-label={`Add task with status: ${status}`}
      >
        <Plus size={12} aria-hidden="true" />
        Add task
      </button>
    </div>
  );
}
