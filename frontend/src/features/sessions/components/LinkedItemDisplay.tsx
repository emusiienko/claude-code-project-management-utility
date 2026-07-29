/**
 * LinkedStoryIndicator / LinkedTaskIndicator — read-only rendering of a
 * session's independent linked story and linked task.
 *
 * `linked_story_id` and `linked_task_id` are two entirely independent,
 * optional fields — either, both, or neither may be set — so each indicator
 * is rendered and clicked on its own, never as a shared either/or slot.
 *
 * Resolves the linked item's title on demand via the existing story/task
 * detail queries (per the implementation plan — sessions carry only raw
 * link ids, never enriched). Clicking navigates away to Task Manager's own
 * detail view for that item, using the session's own `project_id` (a task
 * link only carries the task id, but the owning project is already known
 * from the session).
 */

import { Link } from "react-router-dom";
import { useStory } from "@/features/stories/hooks/useStories";
import { useTask } from "@/features/tasks/hooks/useTasks";

const linkClass =
  "text-brand-600 hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1";

/** Renders a clickable linked-story title, or "None" if unset. */
export function LinkedStoryIndicator({
  projectId,
  storyId,
}: {
  projectId: string;
  storyId: string | null;
}) {
  if (!storyId) return <span className="italic text-text-muted">None</span>;
  return <LinkedStoryLink projectId={projectId} storyId={storyId} />;
}

/** Renders a clickable linked-task title, or "None" if unset. */
export function LinkedTaskIndicator({
  projectId,
  taskId,
}: {
  projectId: string;
  taskId: string | null;
}) {
  if (!taskId) return <span className="italic text-text-muted">None</span>;
  return <LinkedTaskLink projectId={projectId} taskId={taskId} />;
}

function LinkedStoryLink({ projectId, storyId }: { projectId: string; storyId: string }) {
  const { data: story } = useStory(storyId);
  if (!story) return <span className="text-text-muted">Loading…</span>;
  return (
    <Link to={`/projects/${projectId}/stories/${storyId}`} className={linkClass}>
      {story.title}
    </Link>
  );
}

function LinkedTaskLink({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { data: task } = useTask(taskId);
  if (!task) return <span className="text-text-muted">Loading…</span>;
  return (
    <Link
      to={`/projects/${projectId}/stories/${task.story_id}/tasks/${taskId}`}
      className={linkClass}
    >
      {task.title}
    </Link>
  );
}
