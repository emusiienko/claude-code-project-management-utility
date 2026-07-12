/**
 * TaskFilterBar — filter controls above the Task Kanban board.
 *
 * Renders three dropdowns: type, assignee_role, creator_role — all populated
 * from the project's effective settings. Active filters dim non-matching
 * cards purely client-side with no new API calls.
 *
 * @param typeOptions         - Values from the project's effective task_types dictionary.
 * @param roleOptions         - Values from the project's effective participant_roles dictionary.
 * @param filters             - Current filter state.
 * @param onFilterChange      - Called when any filter value changes.
 */

export interface TaskKanbanFilters {
  type: string;
  assignee_role: string;
  creator_role: string;
}

interface TaskFilterBarProps {
  /** Available task type values from the project's effective task_types. */
  typeOptions: string[];
  /** Available role values from the project's effective participant_roles. */
  roleOptions: string[];
  /** Current filter values — empty string means "all". */
  filters: TaskKanbanFilters;
  /** Called with updated filters when any dropdown changes. */
  onFilterChange: (filters: TaskKanbanFilters) => void;
}

/**
 * Client-side filter bar for the Task Kanban. All filtering is done purely
 * in the parent component — this bar only surfaces the controls.
 */
export function TaskFilterBar({
  typeOptions,
  roleOptions,
  filters,
  onFilterChange,
}: TaskFilterBarProps) {
  const selectClass =
    "rounded border border-border bg-surface px-2 py-1 text-xs text-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div
      className="flex flex-wrap items-center gap-3 pb-3"
      role="search"
      aria-label="Task filters"
    >
      <span className="text-xs font-medium text-text-secondary">Filter:</span>

      {/* Type filter */}
      <label className="flex items-center gap-1.5 text-xs text-text-secondary">
        Type
        <select
          value={filters.type}
          onChange={(e) =>
            onFilterChange({ ...filters, type: e.target.value })
          }
          aria-label="Filter by type"
          className={selectClass}
        >
          <option value="">All types</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      {/* Assignee role filter */}
      <label className="flex items-center gap-1.5 text-xs text-text-secondary">
        Assignee
        <select
          value={filters.assignee_role}
          onChange={(e) =>
            onFilterChange({ ...filters, assignee_role: e.target.value })
          }
          aria-label="Filter by assignee role"
          className={selectClass}
        >
          <option value="">All assignees</option>
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      {/* Creator role filter */}
      <label className="flex items-center gap-1.5 text-xs text-text-secondary">
        Creator
        <select
          value={filters.creator_role}
          onChange={(e) =>
            onFilterChange({ ...filters, creator_role: e.target.value })
          }
          aria-label="Filter by creator role"
          className={selectClass}
        >
          <option value="">All creators</option>
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      {/* Clear filters — shown when any filter is active */}
      {(filters.type || filters.assignee_role || filters.creator_role) && (
        <button
          type="button"
          onClick={() =>
            onFilterChange({ type: "", assignee_role: "", creator_role: "" })
          }
          className="text-xs text-brand-600 underline hover:text-brand-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
