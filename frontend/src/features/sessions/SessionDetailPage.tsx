/**
 * SessionDetailPage — full session record at /sessions/:projectId/:sessionId.
 *
 * Nested view within Sessions mode (SessionsShell stays mounted, so the
 * project sidebar remains visible). Shows the full record and lets the user
 * edit every updatable field (topic, goal, context, participant_role,
 * linked story, linked task, result_decisions, result_summary), change
 * `status` independently via a three-way control (settable to any of
 * `pending` / `in-progress` / `finished`, at any time, in any direction),
 * archive the session, and — once archived — permanently delete it. An
 * archived session still shows its full record and stays fully editable —
 * archiving does not restrict this view. Deleting navigates back to the
 * project's session list, since this page's own route no longer resolves
 * once the record is gone.
 */

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Archive, Pencil, Trash2 } from "lucide-react";
import { useSession, useUpdateSession, useArchiveSession, useDeleteSession } from "./hooks/useSessions";
import { useProjectSettingsEffective } from "@/features/settings/hooks/useProjectSettings";
import { SessionEditForm, type SessionEditPayload } from "./components/SessionEditForm";
import { ArchiveSessionDialog } from "./components/ArchiveSessionDialog";
import { DeleteSessionDialog } from "./components/DeleteSessionDialog";
import { LinkedStoryIndicator, LinkedTaskIndicator } from "./components/LinkedItemDisplay";
import { SessionStatusBadge } from "./components/SessionStatusBadge";
import { SessionStatusControl } from "./components/SessionStatusControl";
import { extractErrorMessage, extractFieldErrors } from "./utils/errorMessages";
import { PageLoader } from "@/shared/components/PageLoader";
import type { SessionStatus } from "@/api/types";

function ReadField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-secondary">{label}</dt>
      {/* break-words: some fields (e.g. context) can hold one long unbroken
          string with no spaces — without it the string overflows its
          container and stretches the whole page horizontally (BUG-002) */}
      <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-text">
        {value ? value : <span className="italic text-text-muted">—</span>}
      </dd>
    </div>
  );
}

export default function SessionDetailPage() {
  const { projectId, sessionId } = useParams<{ projectId: string; sessionId: string }>();
  const safeProjectId = projectId ?? "";
  const safeSessionId = sessionId ?? "";
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [mutationError, setMutationError] = useState<string | undefined>();

  const { data: session, isLoading, isError, error } = useSession(safeSessionId);
  const { data: effectiveSettings } = useProjectSettingsEffective(safeProjectId);
  const roleOptions = effectiveSettings?.participant_roles ?? [];

  const updateMutation = useUpdateSession(safeProjectId);
  const archiveMutation = useArchiveSession(safeProjectId);
  const deleteMutation = useDeleteSession(safeProjectId);

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

  function handleStatusChange(status: SessionStatus) {
    setMutationError(undefined);
    updateMutation.mutate(
      { sessionId: safeSessionId, data: { status } },
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

  function handleDeleteConfirm() {
    setMutationError(undefined);
    deleteMutation.mutate(safeSessionId, {
      onSuccess: () => navigate(`/sessions/${safeProjectId}`),
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
        {/* min-w-0 + break-words: the h1 is a flex item of the row below it,
            and flex items default to min-width: auto, which keeps them from
            shrinking below their own intrinsic (unwrapped) content width no
            matter what overflow-wrap/word-break says. min-w-0 lets the item
            actually shrink to the row's available width so break-words can
            engage — break-words alone was not sufficient here (BUG-006). */}
        <h1 className="min-w-0 break-words text-2xl font-semibold text-text">{session.topic}</h1>
        <SessionStatusBadge status={session.status} />
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
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsEditing((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-muted"
        >
          <Pencil size={14} aria-hidden="true" />
          {isEditing ? "Cancel edit" : "Edit"}
        </button>
        <SessionStatusControl
          status={session.status}
          onChange={handleStatusChange}
          disabled={updateMutation.isPending}
        />
        <button
          type="button"
          onClick={() => setIsArchiveDialogOpen(true)}
          disabled={Boolean(session.archived_at)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-muted disabled:opacity-50"
        >
          <Archive size={14} aria-hidden="true" />
          {session.archived_at ? "Archived" : "Archive"}
        </button>
        {session.archived_at && (
          <button
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-status-error/40 px-3 py-1.5 text-sm text-status-error hover:bg-status-error/10"
          >
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </button>
        )}
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
          <ReadField label="Participant role" value={session.participant_role} />
          <div>
            <dt className="text-xs font-medium text-text-secondary">Linked story</dt>
            <dd className="mt-0.5 text-sm">
              <LinkedStoryIndicator projectId={safeProjectId} storyId={session.linked_story_id} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-text-secondary">Linked task</dt>
            <dd className="mt-0.5 text-sm">
              <LinkedTaskIndicator projectId={safeProjectId} taskId={session.linked_task_id} />
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

      {isDeleteDialogOpen && (
        <DeleteSessionDialog
          session={session}
          onConfirm={handleDeleteConfirm}
          onClose={() => setIsDeleteDialogOpen(false)}
          isDeleting={deleteMutation.isPending}
          errorMessage={mutationError}
        />
      )}
    </div>
  );
}
