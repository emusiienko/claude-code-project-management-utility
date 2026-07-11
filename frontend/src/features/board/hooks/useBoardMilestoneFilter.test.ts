/**
 * useBoardMilestoneFilter — unit tests
 *
 * Covers:
 * - When the project has no milestones: selectedMilestoneId is null, milestones is empty.
 * - When milestones exist but none is active: selectedMilestoneId is null.
 * - When an active milestone exists: selectedMilestoneId defaults to its id.
 * - handleSelectMilestone changes selectedMilestoneId.
 * - projectId change resets selectedMilestoneId to the new default (STORY-017).
 * - isLoading is forwarded from useProjectMilestones while the query is in-flight.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Milestone, ListEnvelope } from "@/api/types";

// ---------------------------------------------------------------------------
// Mock useProjectMilestones — the only external boundary for this hook
// ---------------------------------------------------------------------------

vi.mock("@/features/milestones/hooks/useMilestones", () => ({
  useProjectMilestones: vi.fn(),
}));

import { useProjectMilestones } from "@/features/milestones/hooks/useMilestones";
import { useBoardMilestoneFilter } from "./useBoardMilestoneFilter";

const mockUseProjectMilestones = vi.mocked(useProjectMilestones);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMilestone(
  id: string,
  status: Milestone["status"] = "planned",
): Milestone {
  return {
    id,
    name: `Milestone ${id}`,
    description: null,
    project_id: "proj-1",
    status,
    story_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

type QueryResult = { data: ListEnvelope<Milestone> | undefined; isLoading: boolean };

function mockQuery(milestones: Milestone[], isLoading = false) {
  const result: QueryResult = {
    data: isLoading
      ? undefined
      : {
          data: milestones,
          meta: { total: milestones.length, page: 1, limit: 100, totalPages: 1 },
        },
    isLoading,
  };
  mockUseProjectMilestones.mockReturnValue(result as ReturnType<typeof useProjectMilestones>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useBoardMilestoneFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("selectedMilestoneId is null when there are no milestones", () => {
    mockQuery([]);

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    expect(result.current.selectedMilestoneId).toBeNull();
  });

  it("milestones array is empty when there are no milestones", () => {
    mockQuery([]);

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    expect(result.current.milestones).toEqual([]);
  });

  it("selectedMilestoneId is null when milestones exist but none is active", () => {
    mockQuery([makeMilestone("m-1", "planned"), makeMilestone("m-2", "finished")]);

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    expect(result.current.selectedMilestoneId).toBeNull();
  });

  it("selectedMilestoneId defaults to the active milestone id when one exists", () => {
    mockQuery([
      makeMilestone("m-1", "planned"),
      makeMilestone("m-active", "active"),
    ]);

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    expect(result.current.selectedMilestoneId).toBe("m-active");
  });

  it("milestones array contains all fetched milestones", () => {
    const ms = [makeMilestone("m-1", "planned"), makeMilestone("m-2", "active")];
    mockQuery(ms);

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    expect(result.current.milestones).toHaveLength(2);
  });

  it("isLoading is true while the query is in-flight", () => {
    mockQuery([], true);

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    expect(result.current.isLoading).toBe(true);
  });

  it("isLoading is false when the query has resolved", () => {
    mockQuery([]);

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    expect(result.current.isLoading).toBe(false);
  });

  it("handleSelectMilestone changes selectedMilestoneId to the given id", () => {
    mockQuery([makeMilestone("m-1", "planned")]);

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    act(() => {
      result.current.handleSelectMilestone("m-1");
    });

    expect(result.current.selectedMilestoneId).toBe("m-1");
  });

  it("handleSelectMilestone accepts null to show all stories", () => {
    mockQuery([makeMilestone("m-active", "active")]);

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    // Start filtered on the active milestone
    expect(result.current.selectedMilestoneId).toBe("m-active");

    act(() => {
      result.current.handleSelectMilestone(null);
    });

    expect(result.current.selectedMilestoneId).toBeNull();
  });

  it("selectedMilestoneId resets to default when projectId changes", () => {
    // proj-1 has an active milestone
    mockQuery([makeMilestone("m-active", "active")]);

    const { result, rerender } = renderHook(
      ({ projectId }: { projectId: string }) =>
        useBoardMilestoneFilter(projectId),
      { initialProps: { projectId: "proj-1" } },
    );

    // Manually deselect the filter
    act(() => {
      result.current.handleSelectMilestone(null);
    });
    expect(result.current.selectedMilestoneId).toBeNull();

    // Switch to a project with no milestones
    mockQuery([]);
    rerender({ projectId: "proj-2" });

    expect(result.current.selectedMilestoneId).toBeNull();
  });
});
