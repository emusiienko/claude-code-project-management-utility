/**
 * SessionStatusBadge — colour-coded status chip for a session's lifecycle.
 *
 * Driven directly by the `status` enum (`pending` / `in-progress` /
 * `finished`) — this single chip replaces the former separate free-text
 * "status" column and boolean "completion" badge.
 */

import type { SessionStatus } from "@/api/types";

/** Maps wire status values to display labels. */
export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  pending: "Pending",
  "in-progress": "In progress",
  finished: "Finished",
};

/** Tailwind classes for each status chip — finished is emphasised in green. */
const STATUS_BADGE_CLASSES: Record<SessionStatus, string> = {
  pending: "bg-gray-100 text-gray-600",
  "in-progress": "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 font-semibold",
  finished: "bg-green-50 text-green-700",
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
        STATUS_BADGE_CLASSES[status],
      ].join(" ")}
    >
      {SESSION_STATUS_LABELS[status]}
    </span>
  );
}
