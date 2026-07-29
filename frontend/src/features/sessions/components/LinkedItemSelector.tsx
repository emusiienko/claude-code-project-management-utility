/**
 * LinkedItemSelector — picks an optional link to a story or task within the
 * active project, for the Session create form and detail edit form.
 *
 * A session links to at most one item: none, a story, or a task (task links
 * are picked in two steps — story, then task within it — since tasks are
 * always story-scoped and there is no project-wide task list endpoint).
 *
 * When editing an already-linked task, the owning story is resolved once via
 * `useTask` so the story dropdown pre-selects correctly.
 */

import { useEffect, useState } from "react";
import { useStories } from "@/features/stories/hooks/useStories";
import { useTask, useTaskList } from "@/features/tasks/hooks/useTasks";

export interface LinkedItemValue {
  linked_story_id: string | null;
  linked_task_id: string | null;
}

type LinkMode = "none" | "story" | "task";

function initialMode(value: LinkedItemValue): LinkMode {
  if (value.linked_task_id) return "task";
  if (value.linked_story_id) return "story";
  return "none";
}

interface LinkedItemSelectorProps {
  /** Active project — scopes both the story and task selectors. */
  projectId: string;
  value: LinkedItemValue;
  onChange: (value: LinkedItemValue) => void;
  disabled?: boolean;
}

const selectClass =
  "w-full rounded border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50";

/**
 * Controlled none/story/task link selector. Calls `onChange` with the
 * resolved `{ linked_story_id, linked_task_id }` pair on every selection —
 * the two are always mutually exclusive.
 */
export function LinkedItemSelector({
  projectId,
  value,
  onChange,
  disabled = false,
}: LinkedItemSelectorProps) {
  const [mode, setMode] = useState<LinkMode>(() => initialMode(value));
  const [storyId, setStoryId] = useState(value.linked_story_id ?? "");
  const [taskStoryId, setTaskStoryId] = useState("");
  const [taskId, setTaskId] = useState(value.linked_task_id ?? "");

  const { data: storiesEnvelope } = useStories(projectId, {}, 1);
  const stories = storiesEnvelope?.data ?? [];

  // Resolve the owning story of an already-linked task (edit mode) so the
  // story-select step can pre-populate without the caller needing to know it.
  const needsTaskStoryResolution = mode === "task" && Boolean(taskId) && !taskStoryId;
  const { data: linkedTask } = useTask(needsTaskStoryResolution ? taskId : "");
  useEffect(() => {
    if (linkedTask && !taskStoryId) {
      setTaskStoryId(linkedTask.story_id);
    }
  }, [linkedTask, taskStoryId]);

  const { data: tasksEnvelope } = useTaskList(taskStoryId, {}, 1);
  const tasks = tasksEnvelope?.data ?? [];

  function handleModeChange(next: LinkMode) {
    setMode(next);
    if (next === "none") {
      onChange({ linked_story_id: null, linked_task_id: null });
    } else if (next === "story") {
      onChange({ linked_story_id: storyId || null, linked_task_id: null });
    } else {
      onChange({ linked_story_id: null, linked_task_id: taskId || null });
    }
  }

  function handleStorySelect(id: string) {
    setStoryId(id);
    onChange({ linked_story_id: id || null, linked_task_id: null });
  }

  function handleTaskStorySelect(id: string) {
    setTaskStoryId(id);
    setTaskId("");
    onChange({ linked_story_id: null, linked_task_id: null });
  }

  function handleTaskSelect(id: string) {
    setTaskId(id);
    onChange({ linked_story_id: null, linked_task_id: id || null });
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-text-secondary">
        Link to (optional)
      </span>
      <div className="mb-2 flex gap-4 text-sm text-text">
        {(["none", "story", "task"] as const).map((m) => (
          <label key={m} className="flex items-center gap-1.5">
            <input
              type="radio"
              name="session-link-mode"
              checked={mode === m}
              disabled={disabled}
              onChange={() => handleModeChange(m)}
            />
            {m === "none" ? "None" : m === "story" ? "Story" : "Task"}
          </label>
        ))}
      </div>

      {mode === "story" && (
        <select
          aria-label="Linked story"
          value={storyId}
          onChange={(e) => handleStorySelect(e.target.value)}
          disabled={disabled}
          className={selectClass}
        >
          <option value="">Select a story</option>
          {stories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      )}

      {mode === "task" && (
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
            value={taskId}
            onChange={(e) => handleTaskSelect(e.target.value)}
            disabled={disabled || !taskStoryId}
            className={selectClass}
          >
            <option value="">
              {taskStoryId ? "Select a task" : "Select a story first"}
            </option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
