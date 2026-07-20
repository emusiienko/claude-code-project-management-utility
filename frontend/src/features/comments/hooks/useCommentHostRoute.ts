/**
 * useCommentHostRoute — resolves a comment's owning host route.
 *
 * Used by the `/comments/:id` permalink resolver page to turn a comment's
 * `container_type` / `container_id` into the in-app path of the view that
 * renders it (Story slide-over, Task Detail modal, or Milestone Detail page).
 *
 * A story comment's container_id is the story id, but the story's own
 * `project_id` is also needed for the path. A task comment additionally needs
 * the task's `story_id` before the same project lookup applies. Calls the
 * story/task API endpoints directly (not the stories/tasks features' hooks)
 * so this hook stays cross-feature-import-free, per the "shared/ never
 * imports from features/" convention — mirrors `useProjectDetail`.
 *
 * @param comment - The resolved comment, or `undefined` while it is still loading.
 */

import { useQuery } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/config/cacheConfig";
import { DATA_FRESHNESS } from "@/config/apiConfig";
import { getStory } from "@/api/endpoints/stories";
import { getTask } from "@/api/endpoints/tasks";
import type { Comment } from "@/api/types";

export interface CommentHostRoute {
  /** The in-app path to the comment's host view, once resolved. */
  path: string | undefined;
  /** True while a dependent story/task lookup is still in flight. */
  isLoading: boolean;
  /** True if a dependent story/task lookup failed (host cannot be resolved). */
  isError: boolean;
}

/** Resolves the host route for a story, task, or milestone comment. */
export function useCommentHostRoute(comment: Comment | undefined): CommentHostRoute {
  const isTask = comment?.container_type === "task";
  const isStory = comment?.container_type === "story";

  const taskQuery = useQuery({
    queryKey: CACHE_KEYS.tasks.detail(comment?.container_id ?? ""),
    queryFn: () => getTask(comment!.container_id),
    staleTime: DATA_FRESHNESS.TASKS,
    enabled: isTask,
  });

  const storyId = isStory ? comment?.container_id : taskQuery.data?.story_id;

  const storyQuery = useQuery({
    queryKey: CACHE_KEYS.stories.detail(storyId ?? ""),
    queryFn: () => getStory(storyId!),
    staleTime: DATA_FRESHNESS.STORIES,
    enabled: Boolean(storyId) && (isStory || isTask),
  });

  if (!comment) return { path: undefined, isLoading: false, isError: false };

  if (comment.container_type === "milestone") {
    return { path: `/milestones/${comment.container_id}`, isLoading: false, isError: false };
  }

  if (isTask && (taskQuery.isError || (taskQuery.data && storyQuery.isError))) {
    return { path: undefined, isLoading: false, isError: true };
  }
  if (isStory && storyQuery.isError) {
    return { path: undefined, isLoading: false, isError: true };
  }

  if (isTask) {
    if (!taskQuery.data || !storyQuery.data) return { path: undefined, isLoading: true, isError: false };
    return {
      path: `/projects/${storyQuery.data.project_id}/stories/${taskQuery.data.story_id}/tasks/${comment.container_id}`,
      isLoading: false,
      isError: false,
    };
  }

  // isStory
  if (!storyQuery.data) return { path: undefined, isLoading: true, isError: false };
  return {
    path: `/projects/${storyQuery.data.project_id}/stories/${comment.container_id}`,
    isLoading: false,
    isError: false,
  };
}
