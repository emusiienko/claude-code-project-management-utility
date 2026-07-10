/**
 * BoardMilestoneFilter — active-milestone filter banner shown at the top of the Board.
 *
 * Displayed when a project has an active milestone and the Board is filtering to it.
 * Shows the milestone name and a "Show all stories" toggle that clears the filter.
 * When no active milestone exists, renders nothing.
 *
 * @param milestoneName - Name of the currently-active milestone.
 * @param onShowAll     - Called when the user toggles to show all stories.
 */

import { Milestone } from "lucide-react";

interface BoardMilestoneFilterProps {
  milestoneName: string;
  onShowAll: () => void;
}

/** Filter banner rendered when the Board is scoped to an active milestone. */
export function BoardMilestoneFilter({
  milestoneName,
  onShowAll,
}: BoardMilestoneFilterProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-md border border-brand-200 bg-brand-50 px-4 py-2 text-sm"
      role="status"
      aria-live="polite"
    >
      <Milestone
        size={16}
        className="shrink-0 text-brand-600"
        aria-hidden="true"
      />
      <span className="text-text">
        Filtered by milestone:{" "}
        <span className="font-medium text-brand-700">{milestoneName}</span>
      </span>
      <button
        type="button"
        onClick={onShowAll}
        className="ml-auto rounded px-2 py-0.5 text-xs font-medium text-brand-600 hover:bg-brand-100 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        aria-label="Show all stories — remove milestone filter"
        title="Show all stories — remove milestone filter"
      >
        Show all stories
      </button>
    </div>
  );
}
