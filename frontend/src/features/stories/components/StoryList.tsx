/**
 * StoryList — renders the paginated story table for a project.
 *
 * Handles loading, error, and empty states. Delegates row actions
 * (edit, delete, and title click) to the parent via callbacks. Clicking
 * a story title calls onTitleClick, which in the Stories list navigates
 * to the story detail slide-over route.
 */

import { Pencil, Trash2 } from "lucide-react";
import type { Story } from "@/api/types";
import { IconButton } from "@/shared/components/IconButton";
import { PageLoader } from "@/shared/components/PageLoader";
import { extractErrorMessage } from "@/features/stories/utils/errorMessages";
import { useStoryAggregate } from "@/shared/hooks/useStoryAggregate";

interface StoryListProps {
  stories: Story[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onEdit: (story: Story) => void;
  onDelete: (story: Story) => void;
  onNew: () => void;
  /** Called when the user clicks a story title — navigates to the detail route. */
  onTitleClick: (story: Story) => void;
}

/**
 * Status badge rendered as a colored chip.
 */
function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-text-muted italic text-xs">—</span>;
  return (
    <span className="inline-block rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
      {status}
    </span>
  );
}

/**
 * AggregateCell — fetches and displays the "N/M done" task aggregate for one story.
 *
 * Each story row owns its own query instance; they share the TanStack Query cache
 * keyed by story ID, so a task mutation in the Kanban automatically refreshes all
 * visible rows without extra coordination here.
 */
function AggregateCell({ storyId }: { storyId: string }) {
  const { data, isLoading } = useStoryAggregate(storyId);

  if (isLoading || !data) {
    return <span className="text-xs text-text-muted" aria-label="Loading task count">—</span>;
  }

  if (data.total_tasks === 0) {
    return <span className="text-xs text-text-muted">—</span>;
  }

  const doneCount = data.by_status["done"] ?? 0;

  return (
    <span className="text-xs text-text-secondary">
      {doneCount}/{data.total_tasks} done
    </span>
  );
}

/**
 * Label chip for a single key:value pair.
 */
function LabelChip({ label }: { label: { key: string; value: string } }) {
  return (
    <span className="inline-block rounded bg-surface-muted px-1.5 py-0.5 text-xs text-text-secondary">
      <span className="font-medium text-text">{label.key}</span>
      {label.value && (
        <>
          <span className="text-text-muted">:</span>
          <span className="text-text-secondary">{label.value}</span>
        </>
      )}
    </span>
  );
}

/**
 * Story table with edit/delete actions per row.
 * Shows accessible loading, error, and empty states.
 */
export function StoryList({
  stories,
  isLoading,
  isError,
  error,
  onEdit,
  onDelete,
  onNew,
  onTitleClick,
}: StoryListProps) {
  if (isLoading) {
    return <PageLoader />;
  }

  if (isError) {
    return (
      <p
        role="alert"
        className="rounded bg-status-error/10 px-4 py-3 text-sm text-status-error"
      >
        Failed to load stories: {extractErrorMessage(error)}
      </p>
    );
  }

  if (!stories || stories.length === 0) {
    return (
      <div
        aria-live="polite"
        className="flex h-48 flex-col items-center justify-center rounded-md border border-dashed border-border"
      >
        <p className="text-sm font-medium text-text-secondary">No stories yet</p>
        <p className="mt-1 text-xs text-text-muted">
          Create the first story for this project.
        </p>
        <button
          type="button"
          onClick={onNew}
          className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          New story
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted">
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-text-secondary"
            >
              Title
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-text-secondary"
            >
              Status
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-left font-medium text-text-secondary md:table-cell"
            >
              Labels
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-left font-medium text-text-secondary sm:table-cell"
            >
              Tasks
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right font-medium text-text-secondary"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {stories.map((story) => (
            <tr
              key={story.id}
              className="border-b border-border last:border-0 hover:bg-surface-muted/50"
            >
              {/* Title — clickable to open story detail slide-over */}
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onTitleClick(story)}
                  className="text-left font-medium text-brand-600 hover:text-brand-700 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-1 rounded"
                  aria-label={`Open story: ${story.title}`}
                >
                  {story.title}
                </button>
              </td>
              {/* Status badge */}
              <td className="px-4 py-3">
                <StatusBadge status={story.status} />
              </td>
              {/* Label chips */}
              <td className="hidden px-4 py-3 md:table-cell">
                {story.labels.length === 0 ? (
                  <span className="text-xs italic text-text-muted">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {story.labels.map((label, idx) => (
                      <LabelChip key={`${label.key}-${idx}`} label={label} />
                    ))}
                  </div>
                )}
              </td>
              {/* Task aggregate — live "N/M done" counter per story row */}
              <td className="hidden px-4 py-3 sm:table-cell" data-testid="task-aggregate">
                <AggregateCell storyId={story.id} />
              </td>
              {/* Row actions */}
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <IconButton
                    Icon={Pencil}
                    label={`Edit ${story.title}`}
                    onClick={() => onEdit(story)}
                  />
                  <IconButton
                    Icon={Trash2}
                    label={`Delete ${story.title}`}
                    intent="destructive"
                    onClick={() => onDelete(story)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
