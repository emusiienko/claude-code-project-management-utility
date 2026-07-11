/**
 * BoardMilestoneFilter — milestone combobox rendered in the Board header.
 *
 * Lists all project milestones as `<select>` options with a status hint in
 * parentheses (e.g. "Sprint 1 (Active)"). "All stories" appears at the top and
 * maps to a null/empty selection. Changing the selection notifies the parent via
 * `onSelectMilestone`.
 *
 * @param selectedMilestoneId - Currently-selected milestone id, or null for "All stories".
 * @param milestones          - All milestones for the current project.
 * @param onSelectMilestone   - Called with the new milestone id (or null) when selection changes.
 */

import { Milestone as MilestoneIcon } from "lucide-react";
import type { Milestone } from "@/api/types";

interface BoardMilestoneFilterProps {
  selectedMilestoneId: string | null;
  milestones: Milestone[];
  onSelectMilestone: (milestoneId: string | null) => void;
}

/** Maps the wire-format status string to a display hint shown in the option label. */
const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  planned: "Planned",
  finished: "Finished",
};

/** Filter combobox rendered in the Board header to scope stories by milestone. */
export function BoardMilestoneFilter({
  selectedMilestoneId,
  milestones,
  onSelectMilestone,
}: BoardMilestoneFilterProps) {
  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    onSelectMilestone(value === "" ? null : value);
  }

  return (
    <div className="flex items-center gap-2">
      <MilestoneIcon
        size={16}
        className="shrink-0 text-text-secondary"
        aria-hidden="true"
      />
      <label
        htmlFor="board-milestone-filter"
        className="text-sm text-text-secondary"
      >
        Milestone:
      </label>
      <select
        id="board-milestone-filter"
        value={selectedMilestoneId ?? ""}
        onChange={handleChange}
        className="rounded border border-border bg-surface px-2 py-1 text-sm text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-label="Filter stories by milestone"
      >
        <option value="">All stories</option>
        {milestones.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {STATUS_LABEL[m.status] ? ` (${STATUS_LABEL[m.status]})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
