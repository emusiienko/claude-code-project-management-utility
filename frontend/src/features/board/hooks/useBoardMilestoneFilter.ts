/**
 * useBoardMilestoneFilter — manages the Board's milestone combobox filter state.
 *
 * Fetches all milestones for the project and exposes a selectable milestone ID.
 * Defaults to the active milestone on mount and on project navigation change.
 * When no active milestone exists, defaults to null (all stories shown).
 *
 * @param projectId - Owning project ID.
 */

import { useState, useEffect } from "react";
import { useProjectMilestones } from "@/features/milestones/hooks/useMilestones";
import type { Milestone } from "@/api/types";

interface UseBoardMilestoneFilterResult {
  /** The milestone ID currently selected in the combobox, or null for "All stories". */
  selectedMilestoneId: string | null;
  /** All milestones for the project — used to populate the combobox options. */
  milestones: Milestone[];
  /** True while the milestone list is being fetched. */
  isLoading: boolean;
  /** Called when the user picks a different option from the combobox. */
  handleSelectMilestone: (milestoneId: string | null) => void;
}

export function useBoardMilestoneFilter(
  projectId: string,
): UseBoardMilestoneFilterResult {
  const { data: envelope, isLoading } = useProjectMilestones(projectId);
  const milestones = envelope?.data ?? [];

  // Derive the default selection — active milestone id or null (all stories).
  const activeMilestone = milestones.find((m) => m.status === "active") ?? null;
  const defaultId = activeMilestone?.id ?? null;

  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(
    defaultId,
  );

  // Reset selection to the default whenever the project changes or the milestone
  // list resolves for the first time — ensures fresh navigation always picks the
  // active milestone automatically.
  useEffect(() => {
    setSelectedMilestoneId(defaultId);
    // defaultId is derived from milestones, which changes when projectId changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, defaultId]);

  function handleSelectMilestone(milestoneId: string | null) {
    setSelectedMilestoneId(milestoneId);
  }

  return {
    selectedMilestoneId,
    milestones,
    isLoading,
    handleSelectMilestone,
  };
}
