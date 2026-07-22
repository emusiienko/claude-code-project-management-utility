/**
 * ProjectsPanelBody — root level of the Projects overlay stack (STORY-022
 * Revision 3): the project list plus create/edit/delete actions.
 *
 * Renders inside OverlayHost, which owns the panel chrome (title, Back,
 * Dismiss). This component owns only the list content and its create/edit/
 * delete modal orchestration — the same responsibilities the former routed
 * ProjectsPage carried, minus the page heading and "Close" control the
 * overlay frame now owns.
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { ProjectList } from "./ProjectList";
import { ProjectModal } from "./ProjectModal";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import {
  useCreateProject,
  useDeleteProject,
  useProjectListFull,
  useUpdateProject,
} from "../hooks/useProjects";
import type { Project } from "@/api/types";
import type { ProjectFormValues } from "./ProjectForm";
import { extractErrorMessage } from "../utils/errorMessages";

type ModalState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; project: Project }
  | { type: "delete"; project: Project };

interface ProjectsPanelBodyProps {
  /**
   * Called with a project's id when its name is clicked. Pushes that
   * project's Settings as the next overlay level — no route navigation.
   */
  onSelectProject: (projectId: string) => void;
}

/**
 * Projects overlay root: lists projects and provides create/edit/delete actions.
 */
export function ProjectsPanelBody({ onSelectProject }: ProjectsPanelBodyProps) {
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
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-text-secondary">
          Manage the projects that group your stories, tasks, and work artifacts.
        </p>
        <button
          type="button"
          onClick={openCreate}
          aria-label="New project"
          title="New project"
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-brand-600 p-2 text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <ProjectList
        projects={projects}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onEdit={openEdit}
        onDelete={openDelete}
        onSelectProject={onSelectProject}
        onCreateFirst={openCreate}
      />

      {modal.type === "create" && (
        <ProjectModal
          onSubmit={handleCreateSubmit}
          onClose={closeModal}
          isSubmitting={isCreateSubmitting}
          errorMessage={mutationError}
        />
      )}

      {modal.type === "edit" && (
        <ProjectModal
          project={modal.project}
          onSubmit={handleEditSubmit}
          onClose={closeModal}
          isSubmitting={isEditSubmitting}
          errorMessage={mutationError}
        />
      )}

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
