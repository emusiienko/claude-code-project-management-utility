/**
 * SessionList — renders the project-scoped session list.
 *
 * Handles loading, error, and empty states. Shows for each session: topic
 * (links to its detail view), participant_role, an independent linked-story
 * indicator and linked-task indicator (each clickable, shown separately —
 * both appear together when both are set), created_at, and a single status
 * chip driven directly by `status`. Delegates the archive action to the
 * parent via a callback.
 */

import { Archive } from "lucide-react";
import { Link } from "react-router-dom";
import type { Session } from "@/api/types";
import { IconButton } from "@/shared/components/IconButton";
import { PageLoader } from "@/shared/components/PageLoader";
import { LinkedStoryIndicator, LinkedTaskIndicator } from "./LinkedItemDisplay";
import { SessionStatusBadge } from "./SessionStatusBadge";
import { extractErrorMessage } from "@/features/sessions/utils/errorMessages";

interface SessionListProps {
  projectId: string;
  sessions: Session[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onArchive: (session: Session) => void;
  pendingArchiveIds?: Set<string>;
  onCreateFirst?: () => void;
}

/**
 * Session table with an archive action per row.
 * Shows accessible loading, error, and empty states.
 */
export function SessionList({
  projectId,
  sessions,
  isLoading,
  isError,
  error,
  onArchive,
  pendingArchiveIds,
  onCreateFirst,
}: SessionListProps) {
  if (isLoading) {
    return <PageLoader />;
  }

  if (isError) {
    return (
      <p role="alert" className="rounded bg-status-error/10 px-4 py-3 text-sm text-status-error">
        Failed to load sessions: {extractErrorMessage(error)}
      </p>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div
        aria-live="polite"
        className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-20"
      >
        <p className="text-base font-semibold text-text">No sessions yet</p>
        <p className="mt-1 text-sm text-text-secondary">
          Record a working session to track what it was about and what came of it.
        </p>
        {onCreateFirst && (
          <button
            type="button"
            onClick={onCreateFirst}
            className="mt-6 rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Record your first session
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
              Topic
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-text-secondary">
              Participant
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-text-secondary">
              Linked story
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-text-secondary">
              Linked task
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-text-secondary">
              Created
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-text-secondary">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium text-text-secondary">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr
              key={session.id}
              className="border-b border-border last:border-0 hover:bg-surface-muted/50"
            >
              <td className="px-4 py-3 font-medium text-text">
                <Link
                  to={`/sessions/${projectId}/${session.id}`}
                  className="hover:text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
                >
                  {session.topic}
                </Link>
              </td>
              <td className="px-4 py-3 text-text-secondary">{session.participant_role}</td>
              <td className="px-4 py-3">
                <LinkedStoryIndicator projectId={projectId} storyId={session.linked_story_id} />
              </td>
              <td className="px-4 py-3">
                <LinkedTaskIndicator projectId={projectId} taskId={session.linked_task_id} />
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {new Date(session.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <SessionStatusBadge status={session.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <IconButton
                    Icon={Archive}
                    label={`Archive ${session.topic}`}
                    disabled={pendingArchiveIds?.has(session.id)}
                    onClick={() => onArchive(session)}
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
