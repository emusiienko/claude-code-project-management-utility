/**
 * AttachmentsSection — reusable Attachments section for a story, task, or
 * milestone container. Mounted by TASK-005 in the Story slide-over, Task
 * Detail modal, and Milestone Detail view.
 *
 * Renders the container's attachments (title, kind badge, size, timestamp,
 * author role), an "Add attachment" entry point revealing
 * `UploadAttachmentPanel`, the in-app viewer (`AttachmentViewerModal`) for
 * renderable kinds, and a delete confirmation dialog. Attachments are
 * immutable — there is no edit action, only create and delete.
 *
 * @param containerType - story | task | milestone.
 * @param containerId   - The owning container's ID.
 * @param projectId     - Owning project.
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  useAttachmentList,
  useCreateAttachment,
  useDeleteAttachment,
  type CreateAttachmentInput,
} from "@/features/attachments/hooks/useAttachments";
import { AttachmentRow } from "./AttachmentRow";
import { UploadAttachmentPanel } from "./UploadAttachmentPanel";
import { AttachmentViewerModal } from "./AttachmentViewerModal";
import { DeleteAttachmentDialog } from "./DeleteAttachmentDialog";
import { extractErrorMessage, extractFieldErrors } from "@/features/attachments/utils/errorMessages";
import type { Attachment, ContainerType } from "@/api/types";

interface AttachmentsSectionProps {
  containerType: ContainerType;
  containerId: string;
  projectId: string;
}

/** Orchestrates the full attachments UI: list, add panel, viewer, and delete confirmation. */
export function AttachmentsSection({
  containerType,
  containerId,
}: AttachmentsSectionProps) {
  const {
    data: attachmentEnvelope,
    isLoading,
    isError,
  } = useAttachmentList(containerType, containerId);

  const createMutation = useCreateAttachment(containerType, containerId);
  const deleteMutation = useDeleteAttachment(containerType, containerId);

  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | undefined>();
  const [addFieldErrors, setAddFieldErrors] = useState<Record<string, string>>({});
  const [viewingAttachment, setViewingAttachment] = useState<Attachment | undefined>();
  const [pendingDelete, setPendingDelete] = useState<Attachment | undefined>();
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const attachments = attachmentEnvelope?.data ?? [];

  function handleAddSubmit(input: CreateAttachmentInput) {
    setAddError(undefined);
    setAddFieldErrors({});
    createMutation.mutate(input, {
      onSuccess: () => {
        setIsAdding(false);
        setAddError(undefined);
        setAddFieldErrors({});
      },
      onError: (err) => {
        setAddError(extractErrorMessage(err));
        setAddFieldErrors(extractFieldErrors(err));
      },
    });
  }

  function handleDeleteConfirm() {
    if (!pendingDelete) return;
    setDeleteError(undefined);
    deleteMutation.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(undefined),
      onError: (err) => setDeleteError(extractErrorMessage(err)),
    });
  }

  return (
    <section aria-label="Attachments">
      {/* Header with "Add attachment" toggle */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Attachments
          {!isLoading && !isError && (
            <span
              aria-label={`${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`}
              className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold normal-case tracking-normal text-text-secondary"
            >
              {attachments.length}
            </span>
          )}
        </h3>
        {!isAdding && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setAddError(undefined);
              setAddFieldErrors({});
            }}
            className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            aria-label="Add attachment"
          >
            <Plus size={13} aria-hidden="true" />
            <span>Add attachment</span>
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-6" aria-busy="true">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {!isLoading && isError && (
        <p role="alert" className="rounded-md bg-status-error/10 px-4 py-3 text-sm text-status-error">
          Failed to load attachments. Please refresh and try again.
        </p>
      )}

      {/* Empty state */}
      {!isLoading && !isError && attachments.length === 0 && !isAdding && (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-text-muted">
          No attachments yet.
        </p>
      )}

      {/* Attachment list */}
      {!isLoading && !isError && attachments.length > 0 && (
        <ul aria-label="Attachments list" className="divide-y divide-border rounded-md border border-border">
          {attachments.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              attachment={attachment}
              onView={setViewingAttachment}
              onDelete={(a) => {
                setPendingDelete(a);
                setDeleteError(undefined);
              }}
            />
          ))}
        </ul>
      )}

      {/* Add attachment panel */}
      {isAdding && (
        <div className="mt-3">
          <UploadAttachmentPanel
            onSubmit={handleAddSubmit}
            onCancel={() => {
              setIsAdding(false);
              setAddError(undefined);
              setAddFieldErrors({});
            }}
            isSubmitting={createMutation.isPending}
            errorMessage={addError}
            fieldErrors={addFieldErrors}
          />
        </div>
      )}

      {/* In-app viewer */}
      {viewingAttachment && (
        <AttachmentViewerModal
          attachment={viewingAttachment}
          onClose={() => setViewingAttachment(undefined)}
        />
      )}

      {/* Delete confirmation dialog */}
      {pendingDelete && (
        <DeleteAttachmentDialog
          attachmentName={pendingDelete.title}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setPendingDelete(undefined);
            setDeleteError(undefined);
          }}
          isDeleting={deleteMutation.isPending}
          errorMessage={deleteError}
        />
      )}
    </section>
  );
}
