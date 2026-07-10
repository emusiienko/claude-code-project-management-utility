/**
 * MilestoneList — renders the list of milestones for a project.
 *
 * Handles loading, error, and empty states. Shows for each milestone:
 * name, status badge (Planned / Active / Finished), story count, truncated
 * description, and status controls (Activate / Finish). Active rows are
 * visually distinguished. Delegates all actions to the parent via callbacks.
 */

import { CircleCheck, Pencil, Play, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { Milestone, MilestoneStatus } from "@/api/types";
import { IconButton } from "@/shared/components/IconButton";
import { PageLoader } from "@/shared/components/PageLoader";
import { extractErrorMessage } from "@/features/milestones/utils/errorMessages";

interface MilestoneListProps {
  milestones: Milestone[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onEdit: (milestone: Milestone) => void;
  onDelete: (milestone: Milestone) => void;
  /** Called when the user clicks the Activate action for a milestone row. */
  onActivate: (milestone: Milestone) => void;
  /** Called when the user clicks the Finish action for a milestone row. */
  onFinish: (milestone: Milestone) => void;
  /** IDs of milestones whose status mutation is in-flight. */
  pendingStatusIds?: Set<string>;
  /** Called when the user clicks "Create your first milestone" in the empty state. */
  onCreateFirst?: () => void;
}

/** Maps wire status values to display labels. */
const STATUS_LABELS: Record<MilestoneStatus, string> = {
  planned: "Planned",
  active: "Active",
  finished: "Finished",
};

/**
 * Tailwind classes for each status badge.
 * Active is visually emphasised; planned and finished are neutral/muted.
 */
const STATUS_BADGE_CLASSES: Record<MilestoneStatus, string> = {
  planned: "bg-gray-100 text-gray-600",
  active: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 font-semibold",
  finished: "bg-green-50 text-green-700",
};

/**
 * Status badge component — capitalised label with colour coding.
 */
function StatusBadge({ status }: { status: MilestoneStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
        STATUS_BADGE_CLASSES[status],
      ].join(" ")}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/**
 * Milestone table with activate/finish/edit/delete actions per row.
 * Shows accessible loading, error, and empty states.
 */
export function MilestoneList({
  milestones,
  isLoading,
  isError,
  error,
  onEdit,
  onDelete,
  onActivate,
  onFinish,
  pendingStatusIds,
  onCreateFirst,
}: MilestoneListProps) {
  if (isLoading) {
    return <PageLoader />;
  }

  if (isError) {
    return (
      <p
        role="alert"
        className="rounded bg-status-error/10 px-4 py-3 text-sm text-status-error"
      >
        Failed to load milestones: {extractErrorMessage(error)}
      </p>
    );
  }

  if (!milestones || milestones.length === 0) {
    return (
      <div
        aria-live="polite"
        className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-20"
      >
        <p className="text-base font-semibold text-text">No milestones yet</p>
        <p className="mt-1 text-sm text-text-secondary">
          Create a milestone to start grouping stories into planning phases.
        </p>
        {onCreateFirst && (
          <button
            type="button"
            onClick={onCreateFirst}
            className="mt-6 rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Create your first milestone
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted">
            <th scope="col" className="px-4 py-3 text-left font-medium text-text-secondary">
              Name
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-text-secondary">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-text-secondary">
              Stories
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-left font-medium text-text-secondary md:table-cell"
            >
              Description
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium text-text-secondary">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {milestones.map((milestone) => (
            <tr
              key={milestone.id}
              className={[
                "border-b border-border last:border-0",
                // Visually distinguish the active milestone row
                milestone.status === "active"
                  ? "bg-brand-50/40 hover:bg-brand-50/60"
                  : "hover:bg-surface-muted/50",
              ].join(" ")}
            >
              <td className="px-4 py-3 font-medium text-text">
                <Link
                  to={`/milestones/${milestone.id}`}
                  className="hover:text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
                >
                  {milestone.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={milestone.status} />
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {milestone.story_count}
              </td>
              <td className="hidden px-4 py-3 text-text-secondary md:table-cell">
                {milestone.description ? (
                  <span className="line-clamp-2">{milestone.description}</span>
                ) : (
                  <span className="italic text-text-muted">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  {/* Activate: available for Planned and Finished milestones */}
                  {milestone.status !== "active" && (
                    <IconButton
                      Icon={Play}
                      label={`Activate ${milestone.name}`}
                      disabled={pendingStatusIds?.has(milestone.id)}
                      onClick={() => onActivate(milestone)}
                    />
                  )}
                  {/* Finish: available for Planned and Active milestones */}
                  {milestone.status !== "finished" && (
                    <IconButton
                      Icon={CircleCheck}
                      label={`Finish ${milestone.name}`}
                      disabled={pendingStatusIds?.has(milestone.id)}
                      onClick={() => onFinish(milestone)}
                    />
                  )}
                  <IconButton
                    Icon={Pencil}
                    label={`Edit ${milestone.name}`}
                    onClick={() => onEdit(milestone)}
                  />
                  <IconButton
                    Icon={Trash2}
                    label={`Delete ${milestone.name}`}
                    intent="destructive"
                    onClick={() => onDelete(milestone)}
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
