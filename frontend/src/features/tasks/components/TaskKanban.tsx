/**
 * TaskKanban — live dictionary-driven task kanban board.
 *
 * Renders one column per effective task_statuses value, in dictionary order.
 * Replaces TaskKanbanPlaceholder in the Story Detail slide-over.
 *
 * Features:
 *   - Column-per-status layout; column names and order from the dictionary, never hardcoded
 *   - Each column header shows a live card count
 *   - Cards show: title, type badge, assignee_role, label chips
 *   - Drag-and-drop via the shared useBoardDrag hook (optimistic update + rollback)
 *   - Filter bar (type, assignee_role, creator_role) dims non-matching cards client-side
 *   - "Add task" at each column footer → create form with status pre-filled + read-only
 *   - Per-card Edit / Delete (hover context menu)
 *   - Aggregate counter ("N/M done") above the board
 *
 * Clicking a task title navigates to `.../tasks/:taskId` (TASK-005 renders the modal).
 *
 * @param storyId         - Owning story ID.
 * @param projectId       - Owning project ID (used to load effective settings).
 * @param taskStatuses    - Effective task_statuses values (from parent's settings call).
 * @param taskTypes       - Effective task_types values.
 * @param roleOptions     - Effective participant_roles values.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import { useBoardDrag } from "@/shared/hooks/useBoardDrag";
import {
  useTaskList,
  useStoryAggregate,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "../hooks/useTasks";
import { TaskFilterBar } from "./TaskFilterBar";
import { TaskColumn } from "./TaskColumn";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import { DeleteTaskDialog } from "./DeleteTaskDialog";
import {
  extractErrorMessage,
  extractFieldErrors,
} from "../utils/errorMessages";
import type { Task, CreateTask } from "@/api/types";
import type { TaskKanbanFilters } from "./TaskFilterBar";

interface TaskKanbanProps {
  /** Owning story ID — used to scope all task fetches and mutations. */
  storyId: string;
  /**
   * Owning project ID — used when building the navigation URL for the Task Detail modal.
   * The slide-over's :projectId param is already known by the parent, so it is passed
   * directly to avoid re-reading it from the route here.
   */
  projectId: string;
  /** Effective task_statuses from the project settings (column order). */
  taskStatuses: string[];
  /** Effective task_types — for the filter bar and form dropdown. */
  taskTypes: string[];
  /** Effective participant_roles — for the filter bar and form dropdowns. */
  roleOptions: string[];
}

/** State for the create/edit modal. */
interface ModalState {
  open: boolean;
  /** Editing mode when task is set; create mode otherwise. */
  task?: Task;
  /** Pre-filled read-only status (set when opening from a column footer). */
  lockedStatus?: string;
}

/** State for the delete confirmation dialog. */
interface DeleteState {
  open: boolean;
  task?: Task;
}

/**
 * Returns true when the task matches the active filter state.
 * An empty string on any field means "match all".
 */
function taskMatchesFilters(task: Task, filters: TaskKanbanFilters): boolean {
  if (filters.type && task.type !== filters.type) return false;
  if (filters.assignee_role && task.assignee_role !== filters.assignee_role)
    return false;
  if (filters.creator_role && task.creator_role !== filters.creator_role)
    return false;
  return true;
}

/**
 * Live dictionary-driven Task Kanban board.
 * Replaces TaskKanbanPlaceholder in StorySlideOver.
 */
export function TaskKanban({
  storyId,
  projectId,
  taskStatuses,
  taskTypes,
  roleOptions,
}: TaskKanbanProps) {
  const navigate = useNavigate();

  // -----------------------------------------------------------------
  // Server state
  // -----------------------------------------------------------------
  const {
    data: tasksEnvelope,
    isLoading: tasksLoading,
    isError: tasksError,
  } = useTaskList(storyId, undefined, 1);

  const { data: aggregate } = useStoryAggregate(storyId);

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask(storyId);
  const deleteMutation = useDeleteTask(storyId);

  // -----------------------------------------------------------------
  // Local UI state
  // -----------------------------------------------------------------
  const [filters, setFilters] = useState<TaskKanbanFilters>({
    type: "",
    assignee_role: "",
    creator_role: "",
  });

  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [modalState, setModalState] = useState<ModalState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });
  const [modalError, setModalError] = useState<string | undefined>();
  const [modalFieldErrors, setModalFieldErrors] = useState<
    Record<string, string>
  >({});
  const [deleteError, setDeleteError] = useState<string | undefined>();

  // -----------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------
  const allTasks: Task[] = tasksEnvelope?.data ?? [];

  /** IDs of tasks that do NOT match the current filters (to dim them). */
  const dimmedIds = new Set<string>(
    filters.type || filters.assignee_role || filters.creator_role
      ? allTasks
          .filter((t) => !taskMatchesFilters(t, filters))
          .map((t) => t.id)
      : [],
  );

  /** Returns all tasks for a given status column, ordered by created_at ASC. */
  function tasksForStatus(status: string): Task[] {
    return allTasks
      .filter((t) => t.status === status)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
  }

  // -----------------------------------------------------------------
  // Drag-and-drop handlers
  // -----------------------------------------------------------------

  /** Called on a valid cross-column drop — applies optimistic update then calls the API. */
  const handleStatusChange = useCallback(
    (taskId: string, newStatus: string) => {
      // Clear any previous drag error for this card
      setCardErrors((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });

      updateMutation.mutate(
        { taskId, data: { status: newStatus } },
        {
          onError: (err) => {
            setCardErrors((prev) => ({
              ...prev,
              [taskId]: extractErrorMessage(err),
            }));
          },
        },
      );
    },
    [updateMutation],
  );

  /** Called when a drop targets a status no longer in the effective dictionary. */
  const handleInvalidDrop = useCallback(
    (taskId: string, attemptedStatus: string) => {
      setCardErrors((prev) => ({
        ...prev,
        [taskId]: `"${attemptedStatus}" is no longer a valid status.`,
      }));
    },
    [],
  );

  const { activeItemId, sensors, handleDragStart, handleDragEnd } = useBoardDrag({
    validStatuses: taskStatuses,
    onStatusChange: handleStatusChange,
    onInvalidDrop: handleInvalidDrop,
  });

  const activeTask = activeItemId
    ? allTasks.find((t) => t.id === activeItemId)
    : null;

  // -----------------------------------------------------------------
  // Modal handlers
  // -----------------------------------------------------------------

  function openCreate(lockedStatus?: string) {
    setModalError(undefined);
    setModalFieldErrors({});
    setModalState({ open: true, task: undefined, lockedStatus });
  }

  function openEdit(task: Task) {
    setModalError(undefined);
    setModalFieldErrors({});
    setModalState({ open: true, task });
  }

  function closeModal() {
    setModalState({ open: false });
    setModalError(undefined);
    setModalFieldErrors({});
  }

  function handleModalSubmit(values: CreateTask) {
    setModalError(undefined);
    setModalFieldErrors({});

    if (modalState.task) {
      // Edit path
      updateMutation.mutate(
        { taskId: modalState.task.id, data: values },
        {
          onSuccess: () => closeModal(),
          onError: (err) => {
            setModalError(extractErrorMessage(err));
            setModalFieldErrors(extractFieldErrors(err));
          },
        },
      );
    } else {
      // Create path
      createMutation.mutate(
        { storyId, data: values },
        {
          onSuccess: () => closeModal(),
          onError: (err) => {
            setModalError(extractErrorMessage(err));
            setModalFieldErrors(extractFieldErrors(err));
          },
        },
      );
    }
  }

  // -----------------------------------------------------------------
  // Delete handlers
  // -----------------------------------------------------------------

  function openDelete(task: Task) {
    setDeleteError(undefined);
    setDeleteState({ open: true, task });
  }

  function closeDelete() {
    setDeleteState({ open: false });
    setDeleteError(undefined);
  }

  function handleDeleteConfirm() {
    if (!deleteState.task) return;
    setDeleteError(undefined);
    deleteMutation.mutate(deleteState.task.id, {
      onSuccess: () => closeDelete(),
      onError: (err) => setDeleteError(extractErrorMessage(err)),
    });
  }

  // -----------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------

  function handleTitleClick(task: Task) {
    navigate(
      `/projects/${projectId}/stories/${storyId}/tasks/${task.id}`,
    );
  }

  // -----------------------------------------------------------------
  // Aggregate display
  // -----------------------------------------------------------------

  const totalTasks = aggregate?.total_tasks ?? 0;
  const doneCount = aggregate?.by_status?.["done"] ?? 0;
  const aggregateLabel =
    totalTasks === 0 ? "—" : `${doneCount}/${totalTasks} done`;

  // -----------------------------------------------------------------
  // Render guards
  // -----------------------------------------------------------------

  if (tasksLoading) {
    return (
      <section aria-label="Task board" aria-busy="true">
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      </section>
    );
  }

  if (tasksError) {
    return (
      <section aria-label="Task board">
        <p
          role="alert"
          className="rounded bg-status-error/10 px-4 py-3 text-sm text-status-error"
        >
          Failed to load tasks. Check your connection and refresh.
        </p>
      </section>
    );
  }

  if (taskStatuses.length === 0) {
    return (
      <section aria-label="Task board">
        <p
          aria-live="polite"
          className="rounded-md border border-dashed border-border p-6 text-center text-sm text-text-secondary"
        >
          No task statuses configured. Add statuses in Project Settings to use
          the task board.
        </p>
      </section>
    );
  }

  // -----------------------------------------------------------------
  // Board canvas
  // -----------------------------------------------------------------

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <section aria-label="Task board">
      {/* Aggregate counter */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Tasks
        </h3>
        <span
          className="text-xs text-text-secondary"
          aria-live="polite"
          aria-label={`Task aggregate: ${aggregateLabel}`}
        >
          {aggregateLabel}
        </span>
      </div>

      {/* Filter bar */}
      <TaskFilterBar
        typeOptions={taskTypes}
        roleOptions={roleOptions}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Columns expand to fill available width; overflow-x-auto handles narrow viewports */}
        <div
          className="overflow-x-auto pb-4"
          role="region"
          aria-label="Task kanban board"
        >
          <div
            className="flex gap-3"
          >
            {taskStatuses.map((status) => (
              <TaskColumn
                key={status}
                status={status}
                tasks={tasksForStatus(status)}
                dimmedIds={dimmedIds}
                cardErrors={cardErrors}
                onTitleClick={handleTitleClick}
                onEdit={openEdit}
                onDelete={openDelete}
                onAddTask={openCreate}
              />
            ))}
          </div>
        </div>

        {/* Drag overlay — ghost card that follows the pointer during drag */}
        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              onTitleClick={() => {
                /* no-op — overlay is visual only */
              }}
              onEdit={() => {
                /* no-op */
              }}
              onDelete={() => {
                /* no-op */
              }}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Create / Edit modal */}
      {modalState.open && (
        <TaskModal
          task={modalState.task}
          lockedStatus={modalState.lockedStatus}
          typeOptions={taskTypes}
          statusOptions={taskStatuses}
          roleOptions={roleOptions}
          fieldErrors={modalFieldErrors}
          onSubmit={handleModalSubmit}
          onClose={closeModal}
          isSubmitting={isMutating}
          errorMessage={modalError}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteState.open && deleteState.task && (
        <DeleteTaskDialog
          task={deleteState.task}
          onConfirm={handleDeleteConfirm}
          onCancel={closeDelete}
          isDeleting={deleteMutation.isPending}
          errorMessage={deleteError}
        />
      )}
    </section>
  );
}
