/**
 * TaskKanbanPlaceholder — placeholder kanban board with one column per task
 * status from the project's effective task_statuses dictionary.
 *
 * Task Management (STORY-005) is not yet implemented. This component renders
 * the column structure without any live task data and without calling task
 * endpoints. Each column shows a "Tasks coming soon" message.
 *
 * @param statusOptions - Task status values from the project's effective settings.
 * @param storyId       - Story ID (reserved for STORY-005 data fetching).
 */

interface TaskKanbanPlaceholderProps {
  /** Task status values from the project's effective task_statuses dictionary. */
  statusOptions: string[];
  /** Story ID — unused until STORY-005 implements live task data. */
  storyId: string;
}

/** Fallback columns when task_statuses dictionary is empty or not yet loaded. */
const FALLBACK_COLUMNS = ["To Do", "In Progress", "Done"];

/**
 * Placeholder kanban board. Renders one column per task status with an empty
 * state message. No task endpoint calls are made here.
 */
export function TaskKanbanPlaceholder({
  statusOptions,
  // storyId is intentionally unused — reserved for STORY-005
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  storyId: _storyId,
}: TaskKanbanPlaceholderProps) {
  const columns = statusOptions.length > 0 ? statusOptions : FALLBACK_COLUMNS;

  return (
    <section aria-label="Task board (placeholder)">
      <h3 className="mb-4 text-sm font-semibold text-text-secondary uppercase tracking-wide">
        Tasks
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((status) => (
          <div
            key={status}
            className="flex min-w-[200px] flex-col rounded-lg border border-border bg-surface-muted/50 p-3"
          >
            {/* Column header */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {status}
              </span>
              <span className="rounded-full bg-surface px-1.5 py-0.5 text-xs text-text-muted border border-border">
                0
              </span>
            </div>

            {/* Empty column placeholder */}
            <div className="flex h-24 flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface/50">
              <p className="text-xs text-text-muted">Tasks coming soon</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-text-muted" aria-live="polite">
        Task management will be available in a future update (STORY-005).
      </p>
    </section>
  );
}
