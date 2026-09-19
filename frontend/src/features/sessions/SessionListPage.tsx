/**
 * SessionListPage — Sessions list at /sessions/:projectId (Sessions mode's
 * index leaf route, rendered inside SessionsProjectGate/SessionsShell).
 *
 * Lists sessions scoped to the active project only — there is no
 * cross-project session listing. Provides the independently-combinable
 * "incomplete only" and "linked to story" filters, an "include archived"
 * toggle (so an archived session stays reachable from the list — the
 * archive edge case only makes sense if the record is still discoverable),
 * pagination, session creation, the archive row action, and the delete row
 * action (rendered only for already-archived sessions — see SessionList).
 */

import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useParams } from "react-router-dom";
import { SessionList } from "./components/SessionList";
import { SessionModal } from "./components/SessionModal";
import { ArchiveSessionDialog } from "./components/ArchiveSessionDialog";
import { DeleteSessionDialog } from "./components/DeleteSessionDialog";
import {
  useSessionList,
  useCreateSession,
  useArchiveSession,
  useDeleteSession,
  type SessionFilters,
} from "./hooks/useSessions";
import { useProjectSettingsEffective } from "@/features/settings/hooks/useProjectSettings";
import { useStories } from "@/features/stories/hooks/useStories";
import { SelectField } from "@/shared/components/SelectField";
import { extractErrorMessage, extractFieldErrors } from "./utils/errorMessages";
import type { Session } from "@/api/types";
import type { SessionCreatePayload } from "./components/SessionForm";

type ModalState =
  | { type: "none" }
  | { type: "create" }
  | { type: "archive"; session: Session }
  | { type: "delete"; session: Session };

export default function SessionListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const safeProjectId = projectId ?? "";

  const [filters, setFilters] = useState<SessionFilters>({});
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [mutationError, setMutationError] = useState<string | undefined>();

  const { data: effectiveSettings } = useProjectSettingsEffective(safeProjectId);
  const roleOptions = effectiveSettings?.participant_roles ?? [];

  const { data: storiesEnvelope } = useStories(safeProjectId, {}, 1);
  const stories = storiesEnvelope?.data ?? [];

  const {
    data: sessionsEnvelope,
    isLoading,
    isError,
    error,
  } = useSessionList(safeProjectId, filters, page);
  const sessions = sessionsEnvelope?.data;
  const meta = sessionsEnvelope?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;

  const createMutation = useCreateSession(safeProjectId);
  const archiveMutation = useArchiveSession(safeProjectId);
  const deleteMutation = useDeleteSession(safeProjectId);

  function openCreate() {
    setMutationError(undefined);
    setModal({ type: "create" });
  }

  function openArchive(session: Session) {
    setMutationError(undefined);
    setModal({ type: "archive", session });
  }

  function openDelete(session: Session) {
    setMutationError(undefined);
    setModal({ type: "delete", session });
  }

  function closeModal() {
    setModal({ type: "none" });
    setMutationError(undefined);
  }

  function handleFilterChange(next: Partial<SessionFilters>) {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...next }));
  }

  function handleCreateSubmit(values: SessionCreatePayload) {
    setMutationError(undefined);
    createMutation.mutate(
      { project_id: safeProjectId, ...values },
      {
        onSuccess: () => closeModal(),
        onError: (err) => setMutationError(extractErrorMessage(err)),
      },
    );
  }

  function handleArchiveConfirm() {
    if (modal.type !== "archive") return;
    setMutationError(undefined);
    archiveMutation.mutate(modal.session.id, {
      onSuccess: () => closeModal(),
      onError: (err) => setMutationError(extractErrorMessage(err)),
    });
  }

  function handleDeleteConfirm() {
    if (modal.type !== "delete") return;
    setMutationError(undefined);
    deleteMutation.mutate(modal.session.id, {
      onSuccess: () => closeModal(),
      onError: (err) => setMutationError(extractErrorMessage(err)),
    });
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">Sessions</h1>
        <button
          type="button"
          onClick={openCreate}
          aria-label="New session"
          title="New session"
          className="inline-flex items-center justify-center rounded-md bg-brand-600 p-2 text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
        <label
          className="flex items-center gap-1.5 text-text"
          title="Pending or in-progress"
        >
          <input
            type="checkbox"
            checked={filters.incomplete ?? false}
            onChange={(e) => handleFilterChange({ incomplete: e.target.checked || undefined })}
          />
          Incomplete only
        </label>

        <label className="flex items-center gap-1.5 text-text">
          Linked story
          <SelectField
            value={filters.linked_story_id ?? ""}
            onChange={(e) =>
              handleFilterChange({ linked_story_id: e.target.value || undefined })
            }
            className="rounded border border-border bg-surface px-2 py-1 text-sm text-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            wrapperClassName="inline-block w-auto"
          >
            <option value="">Any</option>
            {stories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </SelectField>
        </label>

        <label className="flex items-center gap-1.5 text-text">
          <input
            type="checkbox"
            checked={filters.include_archived ?? false}
            onChange={(e) =>
              handleFilterChange({ include_archived: e.target.checked || undefined })
            }
          />
          Include archived
        </label>
      </div>

      {mutationError && modal.type === "none" && (
        <p role="alert" className="mb-4 rounded bg-status-error/10 px-4 py-3 text-sm text-status-error">
          {mutationError}
        </p>
      )}

      <SessionList
        projectId={safeProjectId}
        sessions={sessions}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onArchive={openArchive}
        onDelete={openDelete}
        onCreateFirst={openCreate}
      />

      {/* Pagination */}
      {sessions && sessions.length > 0 && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-text-secondary">
          <span>
            Page {page} of {totalPages} ({total} sessions)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              title="Previous page"
              className="rounded p-1 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
              title="Next page"
              className="rounded p-1 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {modal.type === "create" && (
        <SessionModal
          projectId={safeProjectId}
          roleOptions={roleOptions}
          onSubmit={handleCreateSubmit}
          onClose={closeModal}
          isSubmitting={createMutation.isPending}
          errorMessage={mutationError}
          fieldErrors={extractFieldErrors(createMutation.error)}
        />
      )}

      {modal.type === "archive" && (
        <ArchiveSessionDialog
          session={modal.session}
          onConfirm={handleArchiveConfirm}
          onClose={closeModal}
          isArchiving={archiveMutation.isPending}
          errorMessage={mutationError}
        />
      )}

      {modal.type === "delete" && (
        <DeleteSessionDialog
          session={modal.session}
          onConfirm={handleDeleteConfirm}
          onClose={closeModal}
          isDeleting={deleteMutation.isPending}
          errorMessage={mutationError}
        />
      )}
    </div>
  );
}
