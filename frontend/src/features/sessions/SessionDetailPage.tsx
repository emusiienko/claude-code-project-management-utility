/**
 * SessionDetailPage — full session record at /sessions/:projectId/:sessionId.
 *
 * Nested view within Sessions mode (SessionsShell stays mounted, so the
 * project sidebar remains visible). Shows the full record and lets the user
 * edit every updatable field (topic, goal, context, status, participant_role,
 * linked story/task, result_decisions, result_summary), toggle
 * `is_complete` independently of the rest of the record, and archive the
 * session. An archived session still shows its full record and stays fully
 * editable — archiving does not restrict this view.
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Archive, Pencil } from "lucide-react";
import { useSession, useUpdateSession, useArchiveSession } from "./hooks/useSessions";
import { useProjectSettingsEffective } from "@/features/settings/hooks/useProjectSettings";
import { SessionEditForm, type SessionEditPayload } from "./components/SessionEditForm";
import { ArchiveSessionDialog } from "./components/ArchiveSessionDialog";
import { LinkedItemDisplay } from "./components/LinkedItemDisplay";
import { extractErrorMessage, extractFieldErrors } from "./utils/errorMessages";
import { PageLoader } from "@/shared/components/PageLoader";

function CompletionBadge({ isComplete }: { isComplete: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs",
        isComplete ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600",
      ].join(" ")}
    >
      {isComplete ? "Complete" : "Pending"}
    </span>
  );
}

function ReadField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-secondary">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm text-text">
        {value ? value : <span className="italic text-text-muted">—</span>}
      </dd>
    </div>
  );
}

export default function SessionDetailPage() {
  const { projectId, sessionId } = useParams<{ projectId: string; sessionId: string }>();
  const safeProjectId = projectId ?? "";
  const safeSessionId = sessionId ?? "";

  const [isEditing, setIsEditing] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [mutationError, setMutationError] = useState<string | undefined>();

  const { data: session, isLoading, isError, error } = useSession(safeSessionId);
  const { data: effectiveSettings } = useProjectSettingsEffective(safeProjectId);
  const roleOptions = effectiveSettings?.participant_roles ?? [];

  const updateMutation = useUpdateSession(safeProjectId);
  const archiveMutation = useArchiveSession(safeProjectId);

  function handleEditSubmit(values: SessionEditPayload) {
    setMutationError(undefined);
    updateMutation.mutate(
      { sessionId: safeSessionId, data: values },
      {
        onSuccess: () => setIsEditing(false),
        onError: (err) => setMutationError(extractErrorMessage(err)),
      },
    );
  }

  function handleToggleComplete() {
    if (!session) return;
    setMutationError(undefined);
    updateMutation.mutate(
      { sessionId: safeSessionId, data: { is_complete: !session.is_complete } },
      { onError: (err) => setMutationError(extractErrorMessage(err)) },
    );
  }

  function handleArchiveConfirm() {
    setMutationError(undefined);
    archiveMutation.mutate(safeSessionId, {
      onSuccess: () => setIsArchiveDialogOpen(false),
      onError: (err) => setMutationError(extractErrorMessage(err)),
    });
  }

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !session) {
    return (
      <div className="p-6">
        <p role="alert" className="rounded bg-status-error/10 px-4 py-3 text-sm text-status-error">
          Failed to load session: {extractErrorMessage(error)}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link
        to={`/sessions/${safeProjectId}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
        aria-label="Back to Sessions"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to Sessions
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-text">{session.topic}</h1>
        <CompletionBadge isComplete={session.is_complete} />
        {session.archived_at && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
            Archived
          </span>
        )}
      </div>

      {mutationError && (
        <p role="alert" className="mt-4 rounded bg-status-error/10 px-4 py-3 text-sm text-status-error">
          {mutationError}
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setIsEditing((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-muted"
        >
          <Pencil size={14} aria-hidden="true" />
          {isEditing ? "Cancel edit" : "Edit"}
        </button>
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={updateMutation.isPending}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-muted disabled:opacity-50"
        >
          {session.is_complete ? "Mark incomplete" : "Mark complete"}
        </button>
        <button
          type="button"
          onClick={() => setIsArchiveDialogOpen(true)}
          disabled={Boolean(session.archived_at)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-muted disabled:opacity-50"
        >
          <Archive size={14} aria-hidden="true" />
          {session.archived_at ? "Archived" : "Archive"}
        </button>
      </div>

      {isEditing ? (
        <div className="mt-6 max-w-xl">
          <SessionEditForm
            session={session}
            projectId={safeProjectId}
            roleOptions={roleOptions}
            fieldErrors={extractFieldErrors(updateMutation.error)}
            onSubmit={handleEditSubmit}
            onCancel={() => setIsEditing(false)}
            isSubmitting={updateMutation.isPending}
          />
        </div>
      ) : (
        <dl className="mt-6 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadField label="Goal" value={session.goal} />
          <ReadField label="Status" value={session.status} />
          <ReadField label="Participant role" value={session.participant_role} />
          <div>
            <dt className="text-xs font-medium text-text-secondary">Linked story/task</dt>
            <dd className="mt-0.5 text-sm">
              <LinkedItemDisplay
                projectId={safeProjectId}
                linkedStoryId={session.linked_story_id}
                linkedTaskId={session.linked_task_id}
              />
            </dd>
          </div>
          <div className="sm:col-span-2">
            <ReadField label="Context" value={session.context} />
          </div>
          <div className="sm:col-span-2">
            <ReadField label="Result — decisions" value={session.result_decisions} />
          </div>
          <div className="sm:col-span-2">
            <ReadField label="Result — summary" value={session.result_summary} />
          </div>
          <ReadField label="Created" value={new Date(session.created_at).toLocaleString()} />
          <ReadField label="Updated" value={new Date(session.updated_at).toLocaleString()} />
        </dl>
      )}

      {isArchiveDialogOpen && (
        <ArchiveSessionDialog
          session={session}
          onConfirm={handleArchiveConfirm}
          onClose={() => setIsArchiveDialogOpen(false)}
          isArchiving={archiveMutation.isPending}
          errorMessage={mutationError}
        />
      )}
    </div>
  );
}
