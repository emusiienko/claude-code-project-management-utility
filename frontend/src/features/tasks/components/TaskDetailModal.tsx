/**
 * TaskDetailModal — Task Detail full-screen modal rendered at the nested route
 * `/projects/:projectId/stories/:storyId/tasks/:taskId`.
 *
 * Mounts on top of the Story Detail slide-over (which stays dimmed but visible
 * behind). `StorySlideOver` renders an `<Outlet />` so this modal is injected
 * as its child route without unmounting the slide-over.
 *
 * Closing (✕ button or Escape) navigates back to the story route, leaving the
 * slide-over open. Escape is coordinated via the shared `useModalEscape` stack
 * so it closes only the topmost host — this modal, or an attachment viewer
 * layered on top of it — never the slide-over underneath.
 *
 * Settings (task_types, task_statuses, participant_roles) are loaded from the
 * project's effective settings — the query is already in-cache from StorySlideOver,
 * so this causes no extra network request.
 */

import { useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTaskDetail, useUpdateTask } from "../hooks/useTasks";
import { useProjectSettingsEffective } from "@/features/settings/hooks/useProjectSettings";
import { useModalEscape } from "@/shared/hooks/useModalEscape";
import { TaskForm } from "./TaskForm";
import { TaskLinksSection } from "./TaskLinksSection";
import { AttachmentsSection } from "@/features/attachments/components/AttachmentsSection";
import { CommentsSection } from "@/features/comments/components/CommentsSection";
import { extractErrorMessage, extractFieldErrors } from "../utils/errorMessages";
import type { CreateTask } from "@/api/types";

/**
 * Task Detail modal. Renders as the `tasks/:taskId` child route of the story
 * slide-over. Full-screen, z-index above the slide-over (z-60).
 */
export function TaskDetailModal() {
  const { projectId = "", storyId = "", taskId = "" } = useParams<{
    projectId: string;
    storyId: string;
    taskId: string;
  }>();
  const navigate = useNavigate();

  // Inline edit mode toggle
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | undefined>();
  const [editFieldErrors, setEditFieldErrors] = useState<
    Record<string, string>
  >({});

  // Task detail query — uses GET /tasks/:id/detail
  const { data: task, isLoading, isError } = useTaskDetail(taskId);

  // Effective settings — already in-cache from StorySlideOver; no extra network call
  const { data: effectiveSettings } = useProjectSettingsEffective(projectId);
  const taskTypes = effectiveSettings?.task_types ?? [];
  const statusOptions = effectiveSettings?.task_statuses ?? [];
  const roleOptions = effectiveSettings?.participant_roles ?? [];

  const updateMutation = useUpdateTask(storyId);

  // Navigate back to the story route — slide-over stays open.
  const handleClose = useCallback(() => {
    navigate(`/projects/${projectId}/stories/${storyId}`);
  }, [navigate, projectId, storyId]);

  useModalEscape(handleClose);

  function handleEditSubmit(values: CreateTask) {
    setEditError(undefined);
    setEditFieldErrors({});
    updateMutation.mutate(
      { taskId, data: values },
      {
        onSuccess: () => {
          setIsEditing(false);
          setEditError(undefined);
          setEditFieldErrors({});
        },
        onError: (err) => {
          setEditError(extractErrorMessage(err));
          setEditFieldErrors(extractFieldErrors(err));
        },
      },
    );
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditError(undefined);
    setEditFieldErrors({});
  }

  return (
    <>
      {/*
       * Modal backdrop — full-screen dim over the slide-over.
       * Intentionally has no onClick handler: the spec says clicking the dimmed
       * slide-over behind the modal must not close it.
       */}
      <div
        className="fixed inset-0 z-[60] bg-black/50"
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={task?.title ?? "Task detail"}
        className="fixed inset-4 z-[70] flex flex-col rounded-lg bg-surface shadow-2xl overflow-hidden"
      >
        {/* ------------------------------------------------------------------ */}
        {/* Fixed header                                                         */}
        {/* ------------------------------------------------------------------ */}
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-6 py-4">
          <div className="min-w-0 flex-1">
            {isLoading ? (
              <div
                className="h-5 w-64 animate-pulse rounded bg-surface-muted"
                aria-busy="true"
              />
            ) : task ? (
              <h2 className="truncate text-lg font-semibold text-text">
                {task.title}
              </h2>
            ) : null}
          </div>

          {/* Edit button — only when loaded and not already editing */}
          {task && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              aria-label={`Edit task: ${task.title}`}
            >
              <Pencil size={14} aria-hidden="true" />
              <span>Edit</span>
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded p-1.5 text-text-secondary hover:bg-surface-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            aria-label="Close task detail"
            title="Close task detail"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {/* ------------------------------------------------------------------ */}
        {/* Scrollable body                                                       */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Loading state */}
          {isLoading && (
            <div
              className="flex h-32 items-center justify-center"
              aria-busy="true"
            >
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          )}

          {/* Not-found / error state */}
          {!isLoading && (isError || !task) && (
            <div
              role="alert"
              className="flex flex-col items-center justify-center gap-3 py-16"
            >
              <p className="text-sm font-medium text-text-secondary">
                Task not found
              </p>
              <p className="text-xs text-text-muted">
                This task may have been deleted or the URL is incorrect.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-2 rounded-md border border-border px-4 py-2 text-sm text-text hover:bg-surface-muted"
              >
                Back to story
              </button>
            </div>
          )}

          {/* Loaded content */}
          {!isLoading && task && (
            <div className="flex flex-col gap-8">
              {/* ---------------------------------------------------------- */}
              {/* Metadata block — replaced by inline edit form when editing  */}
              {/* ---------------------------------------------------------- */}
              {isEditing ? (
                <section aria-label="Edit task">
                  {editError && (
                    <p
                      role="alert"
                      className="mb-4 rounded bg-status-error/10 px-4 py-3 text-sm text-status-error"
                    >
                      {editError}
                    </p>
                  )}
                  <TaskForm
                    initialValues={{
                      title: task.title,
                      type: task.type,
                      status: task.status,
                      content: task.content ?? "",
                      assignee_role: task.assignee_role ?? "",
                      creator_role: task.creator_role ?? "",
                      labels: task.labels,
                    }}
                    typeOptions={taskTypes}
                    statusOptions={statusOptions}
                    roleOptions={roleOptions}
                    fieldErrors={editFieldErrors}
                    onSubmit={handleEditSubmit}
                    onCancel={handleCancelEdit}
                    isSubmitting={updateMutation.isPending}
                    submitLabel="Save changes"
                  />
                </section>
              ) : (
                <section aria-label="Task metadata">
                  <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                    {/* Type badge */}
                    <div>
                      <dt className="text-xs font-medium text-text-muted uppercase tracking-wide">
                        Type
                      </dt>
                      <dd className="mt-1">
                        <span className="inline-block rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 border border-brand-100">
                          {task.type}
                        </span>
                      </dd>
                    </div>

                    {/* Status badge */}
                    <div>
                      <dt className="text-xs font-medium text-text-muted uppercase tracking-wide">
                        Status
                      </dt>
                      <dd className="mt-1">
                        <span className="inline-block rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                          {task.status}
                        </span>
                      </dd>
                    </div>

                    {/* Assignee role */}
                    <div>
                      <dt className="text-xs font-medium text-text-muted uppercase tracking-wide">
                        Assignee
                      </dt>
                      <dd className="mt-1 text-sm text-text">
                        {task.assignee_role ?? (
                          <span className="text-text-muted">—</span>
                        )}
                      </dd>
                    </div>

                    {/* Creator role */}
                    <div>
                      <dt className="text-xs font-medium text-text-muted uppercase tracking-wide">
                        Creator
                      </dt>
                      <dd className="mt-1 text-sm text-text">
                        {task.creator_role ?? (
                          <span className="text-text-muted">—</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {/* Labels */}
                  {task.labels.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                        Labels
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {task.labels.map((label, idx) => (
                          <span
                            key={`${label.key}-${idx}`}
                            className="inline-block rounded bg-surface-muted px-2 py-0.5 text-xs text-text-secondary"
                          >
                            <span className="font-medium text-text">
                              {label.key}
                            </span>
                            {label.value && (
                              <>
                                <span className="text-text-muted">:</span>
                                <span>{label.value}</span>
                              </>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rendered Markdown content */}
                  {task.content && (
                    <div className="mt-6">
                      <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">
                        Description
                      </p>
                      <article
                        className="prose prose-sm max-w-none text-text"
                        aria-label="Task description"
                      >
                        <ReactMarkdown>{task.content}</ReactMarkdown>
                      </article>
                    </div>
                  )}
                </section>
              )}

              {/* ---------------------------------------------------------- */}
              {/* Links section (STORY-006)                                   */}
              {/* ---------------------------------------------------------- */}
              <TaskLinksSection
                taskId={taskId}
                storyId={storyId}
                projectId={projectId}
              />

              {/* ---------------------------------------------------------- */}
              {/* Attachments section (STORY-007)                             */}
              {/* ---------------------------------------------------------- */}
              <AttachmentsSection
                containerType="task"
                containerId={taskId}
                projectId={projectId}
              />

              {/* ---------------------------------------------------------- */}
              {/* Comments section (STORY-008)                                */}
              {/* ---------------------------------------------------------- */}
              <CommentsSection containerType="task" containerId={taskId} projectId={projectId} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
