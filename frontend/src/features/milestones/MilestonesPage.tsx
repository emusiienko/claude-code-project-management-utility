/**
 * MilestonesPage — Milestones tab at /projects/:projectId/milestones.
 *
 * Lists all milestones for the current project (name, status badge, story count,
 * truncated description) and provides create / edit / delete / activate / finish actions.
 *
 * Activating while another milestone is already Active shows a confirmation dialog
 * that names the currently-active milestone before proceeding.
 *
 * All server state lives in TanStack Query hooks; page-level component handles
 * only UI state (which modal is open, which milestone is selected).
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { useParams } from "react-router-dom";
import { MilestoneList } from "./components/MilestoneList";
import { MilestoneModal } from "./components/MilestoneModal";
import { DeleteMilestoneDialog } from "./components/DeleteMilestoneDialog";
import { ActivateMilestoneDialog } from "./components/ActivateMilestoneDialog";
import {
  useProjectMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  useActivateMilestone,
  useFinishMilestone,
} from "./hooks/useMilestones";
import type { Milestone } from "@/api/types";
import type { MilestoneFormValues } from "./components/MilestoneForm";
import { extractErrorMessage } from "./utils/errorMessages";

type ModalState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; milestone: Milestone }
  | { type: "delete"; milestone: Milestone }
  | { type: "confirmActivate"; target: Milestone; currentlyActive: Milestone };

/**
 * Milestones management screen — lists milestones for a project and provides
 * create/edit/delete/activate/finish actions.
 */
export default function MilestonesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const safeProjectId = projectId ?? "";

  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [mutationError, setMutationError] = useState<string | undefined>();
  // Tracks IDs of milestones with an in-flight status mutation for button disabling
  const [pendingStatusIds, setPendingStatusIds] = useState<Set<string>>(new Set());

  // Server data
  const { data: envelope, isLoading, isError, error } = useProjectMilestones(safeProjectId);
  const milestones = envelope?.data;

  // Mutations
  const createMutation = useCreateMilestone();
  const updateMutation = useUpdateMilestone();
  const deleteMutation = useDeleteMilestone();
  const activateMutation = useActivateMilestone();
  const finishMutation = useFinishMilestone();

  // Modal state helpers
  function openCreate() {
    setMutationError(undefined);
    setModal({ type: "create" });
  }

  function openEdit(milestone: Milestone) {
    setMutationError(undefined);
    setModal({ type: "edit", milestone });
  }

  function openDelete(milestone: Milestone) {
    setMutationError(undefined);
    setModal({ type: "delete", milestone });
  }

  function closeModal() {
    setModal({ type: "none" });
    setMutationError(undefined);
  }

  // Submit handlers
  function handleCreateSubmit(values: MilestoneFormValues) {
    setMutationError(undefined);
    createMutation.mutate(
      {
        name: values.name,
        project_id: safeProjectId,
        description: values.description || undefined,
      },
      {
        onSuccess: () => closeModal(),
        onError: (err) => setMutationError(extractErrorMessage(err)),
      },
    );
  }

  function handleEditSubmit(values: MilestoneFormValues) {
    if (modal.type !== "edit") return;
    setMutationError(undefined);
    updateMutation.mutate(
      {
        milestoneId: modal.milestone.id,
        data: {
          name: values.name,
          description: values.description || undefined,
        },
      },
      {
        onSuccess: () => closeModal(),
        onError: (err) => setMutationError(extractErrorMessage(err)),
      },
    );
  }

  function handleDeleteConfirm() {
    if (modal.type !== "delete") return;
    setMutationError(undefined);
    deleteMutation.mutate(modal.milestone.id, {
      onSuccess: () => closeModal(),
      onError: (err) => setMutationError(extractErrorMessage(err)),
    });
  }

  /**
   * Activate a milestone. When another milestone in the project is already Active,
   * show the confirmation dialog first. Otherwise activate directly.
   */
  function handleActivate(milestone: Milestone) {
    const currentlyActive = milestones?.find(
      (m) => m.status === "active" && m.id !== milestone.id,
    );

    if (currentlyActive) {
      setMutationError(undefined);
      setModal({ type: "confirmActivate", target: milestone, currentlyActive });
    } else {
      runActivate(milestone.id);
    }
  }

  function handleConfirmActivate() {
    if (modal.type !== "confirmActivate") return;
    runActivate(modal.target.id);
  }

  function runActivate(milestoneId: string) {
    setPendingStatusIds((prev) => new Set(prev).add(milestoneId));
    setMutationError(undefined);
    activateMutation.mutate(milestoneId, {
      onSuccess: () => {
        closeModal();
        setPendingStatusIds((prev) => {
          const next = new Set(prev);
          next.delete(milestoneId);
          return next;
        });
      },
      onError: (err) => {
        setMutationError(extractErrorMessage(err));
        setPendingStatusIds((prev) => {
          const next = new Set(prev);
          next.delete(milestoneId);
          return next;
        });
      },
    });
  }

  function handleFinish(milestone: Milestone) {
    const { id } = milestone;
    setPendingStatusIds((prev) => new Set(prev).add(id));
    setMutationError(undefined);
    finishMutation.mutate(id, {
      onSuccess: () => {
        setPendingStatusIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },
      onError: (err) => {
        setMutationError(extractErrorMessage(err));
        setPendingStatusIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },
    });
  }

  const isCreateSubmitting = createMutation.isPending;
  const isEditSubmitting = updateMutation.isPending;
  const isDeleteSubmitting = deleteMutation.isPending;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Milestones</h2>
        <button
          type="button"
          onClick={openCreate}
          aria-label="New milestone"
          title="New milestone"
          className="inline-flex items-center justify-center rounded-md bg-brand-600 p-2 text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {/* Inline error banner for Finish failures (no modal open during Finish) */}
      {mutationError && modal.type === "none" && (
        <p
          role="alert"
          className="mb-4 rounded bg-status-error/10 px-4 py-3 text-sm text-status-error"
        >
          {mutationError}
        </p>
      )}

      <MilestoneList
        milestones={milestones}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onEdit={openEdit}
        onDelete={openDelete}
        onActivate={handleActivate}
        onFinish={handleFinish}
        pendingStatusIds={pendingStatusIds}
        onCreateFirst={openCreate}
      />

      {/* Create modal */}
      {modal.type === "create" && (
        <MilestoneModal
          onSubmit={handleCreateSubmit}
          onClose={closeModal}
          isSubmitting={isCreateSubmitting}
          errorMessage={mutationError}
        />
      )}

      {/* Edit modal */}
      {modal.type === "edit" && (
        <MilestoneModal
          milestone={modal.milestone}
          onSubmit={handleEditSubmit}
          onClose={closeModal}
          isSubmitting={isEditSubmitting}
          errorMessage={mutationError}
        />
      )}

      {/* Delete confirmation */}
      {modal.type === "delete" && (
        <DeleteMilestoneDialog
          milestone={modal.milestone}
          onConfirm={handleDeleteConfirm}
          onClose={closeModal}
          isDeleting={isDeleteSubmitting}
          errorMessage={mutationError}
        />
      )}

      {/* Activate-over-active confirmation */}
      {modal.type === "confirmActivate" && (
        <ActivateMilestoneDialog
          target={modal.target}
          currentlyActive={modal.currentlyActive}
          onConfirm={handleConfirmActivate}
          onClose={closeModal}
          isActivating={activateMutation.isPending}
          errorMessage={mutationError}
        />
      )}
    </div>
  );
}
