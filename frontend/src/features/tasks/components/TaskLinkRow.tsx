/**
 * TaskLinkRow — a single row in the task links list.
 *
 * Displays a direction indicator (→ outbound / ← inbound), a link_type badge,
 * and the linked task's title as a clickable link navigating to that task's
 * Task Detail Modal. A delete button triggers the onDelete callback.
 *
 * @param link     - The enriched task link to display.
 * @param storyId  - Owning story ID — required to build the navigation URL.
 * @param projectId - Owning project ID — required to build the navigation URL.
 * @param onDelete - Called when the user clicks the delete button for this row.
 */

import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { IconButton } from "@/shared/components/IconButton";
import { getLinkLabel } from "@/shared/utils/linkLabels";
import type { EnrichedTaskLink } from "@/api/types";

interface TaskLinkRowProps {
  link: EnrichedTaskLink;
  projectId: string;
  storyId: string;
  onDelete: (link: EnrichedTaskLink) => void;
}

/** Single enriched task link row with direction indicator, type badge, and delete action. */
export function TaskLinkRow({
  link,
  projectId,
  storyId,
  onDelete,
}: TaskLinkRowProps) {
  const directionLabel = link.direction === "outbound" ? "→" : "←";
  const directionTitle =
    link.direction === "outbound" ? "Outbound link" : "Inbound link";
  const typeLabel = getLinkLabel(link.link_type, link.direction);
  const taskDetailUrl = `/projects/${projectId}/stories/${storyId}/tasks/${link.linked_task.id}`;

  return (
    <li className="flex items-center gap-3 py-2">
      {/* Direction indicator */}
      <span
        aria-label={directionTitle}
        title={directionTitle}
        className="shrink-0 w-5 text-center text-base font-bold text-text-muted select-none"
      >
        {directionLabel}
      </span>

      {/* Link type badge */}
      <span className="shrink-0 inline-block rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 border border-brand-100">
        {typeLabel}
      </span>

      {/* Linked task title — navigates to that task's detail modal */}
      <Link
        to={taskDetailUrl}
        className="min-w-0 flex-1 truncate text-sm text-brand-700 underline underline-offset-2 hover:text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 rounded"
        aria-label={`Open task: ${link.linked_task.title}`}
      >
        {link.linked_task.title}
      </Link>

      {/* Task status chip */}
      <span className="shrink-0 inline-block rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-secondary">
        {link.linked_task.status}
      </span>

      {/* Delete button */}
      <IconButton
        Icon={Trash2}
        label={`Delete link to ${link.linked_task.title}`}
        intent="destructive"
        onClick={() => onDelete(link)}
      />
    </li>
  );
}
