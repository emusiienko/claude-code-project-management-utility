/**
 * useBoardMilestoneFilter — manages the Board's active-milestone filter state.
 *
 * Behaviour:
 * - When the project has an active milestone, the Board defaults to showing only
 *   that milestone's stories. The filter is applied automatically on first render.
 * - The user can toggle "show all" to see every project story. This toggle is
 *   stored per project in memory and resets when the user navigates away.
 * - Returns the milestoneId to pass to useBoardStories, and the active milestone
 *   metadata needed for the filter banner.
 *
 * @param projectId - Owning project ID.
 */

import { useState, useEffect } from "react";
import { useActiveMilestone } from "@/shared/hooks/useActiveMilestone";
import type { Milestone } from "@/api/types";

interface UseBoardMilestoneFilterResult {
  /** The milestone ID currently filtering stories, or null for unfiltered. */
  activeMilestoneId: string | null;
  /** The active milestone data — null when no active milestone or filter dismissed. */
  activeMilestone: Milestone | null;
  /** Whether the user explicitly dismissed the filter to show all stories. */
  showingAll: boolean;
  /** Called when the user clicks "Show all stories". */
  handleShowAll: () => void;
  isLoading: boolean;
}

export function useBoardMilestoneFilter(
  projectId: string,
): UseBoardMilestoneFilterResult {
  const { data: activeMilestone, isLoading } = useActiveMilestone(projectId);

  // Tracks whether the user explicitly chose "show all" for this board session.
  // Initialized to false — the filter is active by default when a milestone is active.
  // Resets when projectId changes, mirroring "navigate away" semantics.
  const [showingAll, setShowingAll] = useState(false);

  // Reset to filtered view when switching to a different project.
  // This ensures a fresh navigation always defaults to the milestone filter.
  useEffect(() => {
    setShowingAll(false);
  }, [projectId]);

  function handleShowAll() {
    setShowingAll(true);
  }

  const isFiltered = Boolean(activeMilestone) && !showingAll;
  const activeMilestoneId = isFiltered ? (activeMilestone?.id ?? null) : null;

  return {
    activeMilestoneId,
    activeMilestone: isFiltered ? (activeMilestone ?? null) : null,
    showingAll,
    handleShowAll,
    isLoading,
  };
}
