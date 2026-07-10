/**
 * MilestoneAssignment — inline milestone set/clear control for the Story Detail slide-over.
 *
 * Displays the story's current milestone name (or "None assigned") and a native
 * `<select>` populated with milestones belonging to the story's project.
 * Selecting a milestone or the "None" option calls onAssign with the new value.
 *
 * This component is self-contained for data-fetching (milestone list query) but
 * delegates the actual story update to the parent via `onAssign` so the parent
 * owns the mutation lifecycle and error boundary.
 *
 * @param projectId   - Owning project ID — used to scope the milestone list.
 * @param milestoneId - Current milestone assignment on the story (null = none).
 * @param isPending   - True while the parent's update mutation is in flight.
 * @param onAssign    - Called with the selected milestone ID, or null to clear.
 */

import { useProjectMilestones } from "@/features/milestones/hooks/useMilestones";
import type { Milestone } from "@/api/types";

interface MilestoneAssignmentProps {
  /** Owning project ID — scopes the milestone list. */
  projectId: string;
  /** Current milestone_id on the story. null means not assigned. */
  milestoneId: string | null;
  /** True while the parent update mutation is in flight. Disables the control. */
  isPending?: boolean;
  /** Called when the user selects a milestone or clears the assignment. */
  onAssign: (milestoneId: string | null) => void;
}

/** Capitalizes the first letter of a milestone status for display. */
function capitalizeStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Inline milestone assignment control for the Story Detail slide-over.
 * Populated from milestones belonging to the story's project only.
 */
export function MilestoneAssignment({
  projectId,
  milestoneId,
  isPending = false,
  onAssign,
}: MilestoneAssignmentProps) {
  const { data: milestoneList, isLoading } = useProjectMilestones(projectId);

  const milestones: Milestone[] = milestoneList?.data ?? [];
  const activeMilestone = milestones.find((m) => m.id === milestoneId) ?? null;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    onAssign(value === "" ? null : value);
  }

  return (
    <div className="flex flex-col gap-1">
      {isLoading ? (
        <div
          className="h-8 w-full animate-pulse rounded bg-surface-muted"
          aria-busy="true"
        />
      ) : (
        <>
          <select
            id="story-milestone-select"
            value={milestoneId ?? ""}
            onChange={handleChange}
            disabled={isPending}
            aria-label="Assign milestone"
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">None</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.status !== "planned"
                  ? ` (${capitalizeStatus(m.status)})`
                  : ""}
              </option>
            ))}
          </select>

          {/* Show current active milestone as a status hint below the select */}
          {activeMilestone && (
            <p className="text-xs text-text-muted">
              Status:{" "}
              <span
                className={
                  activeMilestone.status === "active"
                    ? "font-medium text-brand-600"
                    : "text-text-secondary"
                }
              >
                {capitalizeStatus(activeMilestone.status)}
              </span>
            </p>
          )}

          {/* Empty project has no milestones yet */}
          {milestones.length === 0 && (
            <p className="text-xs italic text-text-muted">
              No milestones in this project.
            </p>
          )}
        </>
      )}
    </div>
  );
}
