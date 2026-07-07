/**
 * StoryList — renders the paginated story table for a project.
 *
 * Handles loading, error, and empty states. Delegates row actions
 * (edit, delete) to the parent via callbacks. Clicking the story title
 * opens the edit modal (same as the edit icon button).
 */

import { Pencil, Trash2 } from "lucide-react";
import type { Story } from "@/api/types";
import { IconButton } from "@/shared/components/IconButton";
import { PageLoader } from "@/shared/components/PageLoader";
import { extractErrorMessage } from "@/features/stories/utils/errorMessages";

interface StoryListProps {
  stories: Story[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onEdit: (story: Story) => void;
  onDelete: (story: Story) => void;
  onNew: () => void;
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
              {/* Title — clickable to open edit modal */}
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onEdit(story)}
                  className="text-left font-medium text-brand-600 hover:text-brand-700 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-1 rounded"
                  aria-label={`Edit story: ${story.title}`}
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
              {/* Task aggregate — N/A until STORY-005 */}
              <td className="hidden px-4 py-3 text-text-muted sm:table-cell" data-testid="task-aggregate">
                N/A
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
