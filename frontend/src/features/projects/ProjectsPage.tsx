/**
 * ProjectsPage — entry point for the /projects route.
 *
 * Orchestrates the project list, create/edit modal, and delete confirmation
 * dialog. All server state lives in TanStack Query hooks; this component
 * handles only page-level UI state (which modal is open, which project is
 * selected for edit or delete).
 *
 * Carries a browser-history "Back" button (BUG-005) mirroring SettingsPage's —
 * since the global top-bar "Projects" entry (STORY-022) is reachable from any
 * app state, including deep inside a Story/Task view, this page needs the same
 * "return to where I was" affordance the global "Config" entry already had.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { ProjectList } from "./components/ProjectList";
import { ProjectModal } from "./components/ProjectModal";
import { DeleteProjectDialog } from "./components/DeleteProjectDialog";
import {
  useCreateProject,
  useDeleteProject,
  useProjectListFull,
  useUpdateProject,
} from "./hooks/useProjects";
import type { Project } from "@/api/types";
import type { ProjectFormValues } from "./components/ProjectForm";
import { extractErrorMessage } from "./utils/errorMessages";

type ModalState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; project: Project }
  | { type: "delete"; project: Project };

/**
 * Project Management screen — lists projects and provides create/edit/delete actions.
 */
export default function ProjectsPage() {
  const navigate = useNavigate();
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [mutationError, setMutationError] = useState<string | undefined>();

  const { data: projects, isLoading, isError, error } = useProjectListFull();

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  function openCreate() {
    setMutationError(undefined);
    setModal({ type: "create" });
  }

  function openEdit(project: Project) {
    setMutationError(undefined);
    setModal({ type: "edit", project });
  }

  function openDelete(project: Project) {
    setMutationError(undefined);
    setModal({ type: "delete", project });
  }

  function closeModal() {
    setModal({ type: "none" });
    setMutationError(undefined);
  }

  function handleCreateSubmit(values: ProjectFormValues) {
    setMutationError(undefined);
    createMutation.mutate(
      { name: values.name, description: values.description || undefined },
      {
        onSuccess: () => closeModal(),
        onError: (err) => setMutationError(extractErrorMessage(err)),
      },
    );
  }

  function handleEditSubmit(values: ProjectFormValues) {
    if (modal.type !== "edit") return;
    setMutationError(undefined);
    updateMutation.mutate(
      {
        id: modal.project.id,
        body: { name: values.name, description: values.description || undefined },
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
    deleteMutation.mutate(modal.project.id, {
      onSuccess: () => closeModal(),
      onError: (err) => setMutationError(extractErrorMessage(err)),
    });
  }

  const isCreateSubmitting = createMutation.isPending;
  const isEditSubmitting = updateMutation.isPending;
  const isDeleteSubmitting = deleteMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      {/* Back navigation — mirrors SettingsPage's browser-history back button so
          the global, mode-independent Projects entry (STORY-022) offers the same
          "return to where I was" affordance as the global Config entry (BUG-005) */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        aria-label="Go back to previous page"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back
      </button>

      {/* Page heading */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Projects</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage the projects that group your stories, tasks, and work artifacts.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          aria-label="New project"
          title="New project"
          className="inline-flex items-center justify-center rounded-md bg-brand-600 p-2 text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {/* Project list */}
      <ProjectList
        projects={projects}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onEdit={openEdit}
        onDelete={openDelete}
        onCreateFirst={openCreate}
      />

      {/* Create modal */}
      {modal.type === "create" && (
        <ProjectModal
          onSubmit={handleCreateSubmit}
          onClose={closeModal}
          isSubmitting={isCreateSubmitting}
          errorMessage={mutationError}
        />
      )}

      {/* Edit modal */}
      {modal.type === "edit" && (
        <ProjectModal
          project={modal.project}
          onSubmit={handleEditSubmit}
          onClose={closeModal}
          isSubmitting={isEditSubmitting}
          errorMessage={mutationError}
        />
      )}

      {/* Delete confirmation */}
      {modal.type === "delete" && (
        <DeleteProjectDialog
          project={modal.project}
          onConfirm={handleDeleteConfirm}
          onClose={closeModal}
          isDeleting={isDeleteSubmitting}
          errorMessage={mutationError}
        />
      )}
    </div>
  );
}
