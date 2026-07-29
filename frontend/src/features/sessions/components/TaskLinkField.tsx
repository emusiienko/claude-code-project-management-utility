/**
 * TaskLinkField — picks an optional link to a task within the active
 * project, for the Session create form and detail edit form.
 *
 * Independent of StoryLinkField: a session may hold a story link, a task
 * link, both, or neither at the same time, so this control only ever reads
 * and writes `linked_task_id`. Picking a task is two steps — the task's
 * story, then the task within it — since tasks are always story-scoped and
 * there is no project-wide task list endpoint; that story choice is this
 * control's own scaffolding and never touches `linked_story_id`.
 *
 * When editing an already-linked task, the owning story is resolved once via
 * `useTask` so the story dropdown pre-selects correctly.
 */

import { useEffect, useState } from "react";
import { useStories } from "@/features/stories/hooks/useStories";
import { useTask, useTaskList } from "@/features/tasks/hooks/useTasks";

interface TaskLinkFieldProps {
  /** Active project — scopes both the task's-story and task selectors. */
  projectId: string;
  value: string | null;
  onChange: (taskId: string | null) => void;
  disabled?: boolean;
}

const selectClass =
  "w-full rounded border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50";

/** Controlled optional task-link selector, independent of the story link. */
export function TaskLinkField({
  projectId,
  value,
  onChange,
  disabled = false,
}: TaskLinkFieldProps) {
  const [taskStoryId, setTaskStoryId] = useState("");

  const { data: storiesEnvelope } = useStories(projectId, {}, 1);
  const stories = storiesEnvelope?.data ?? [];

  // Resolve the owning story of an already-linked task (edit mode) so the
  // story-select step can pre-populate without the caller needing to know it.
  const needsStoryResolution = Boolean(value) && !taskStoryId;
  const { data: linkedTask } = useTask(needsStoryResolution ? (value as string) : "");
  useEffect(() => {
    if (linkedTask && !taskStoryId) {
      setTaskStoryId(linkedTask.story_id);
    }
  }, [linkedTask, taskStoryId]);

  const { data: tasksEnvelope } = useTaskList(taskStoryId, {}, 1);
  const tasks = tasksEnvelope?.data ?? [];

  function handleTaskStorySelect(id: string) {
    setTaskStoryId(id);
    onChange(null);
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-text-secondary">
        Linked task (optional)
      </span>
      <div className="flex flex-col gap-2">
        <select
          aria-label="Task's story"
          value={taskStoryId}
          onChange={(e) => handleTaskStorySelect(e.target.value)}
          disabled={disabled}
          className={selectClass}
        >
          <option value="">Select the task's story</option>
          {stories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <select
          aria-label="Linked task"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={disabled || !taskStoryId}
          className={selectClass}
        >
          <option value="">{taskStoryId ? "None" : "Select a story first"}</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
