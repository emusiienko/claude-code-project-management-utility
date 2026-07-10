/**
 * useBoardMilestoneFilter — unit tests
 *
 * Covers:
 * - When no active milestone: activeMilestoneId is null, activeMilestone is null,
 *   showingAll is false, isLoading reflects the underlying query state.
 * - When an active milestone exists: activeMilestoneId equals its id,
 *   activeMilestone is the milestone object, showingAll is false.
 * - handleShowAll: sets showingAll to true; activeMilestoneId becomes null;
 *   activeMilestone becomes null (filter dismissed).
 * - projectId change resets showingAll to false (navigating away semantics).
 * - isLoading is forwarded from useActiveMilestone while the query is in-flight.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Milestone } from "@/api/types";

// ---------------------------------------------------------------------------
// Mock useActiveMilestone — the only external boundary for this hook
// ---------------------------------------------------------------------------

vi.mock("@/shared/hooks/useActiveMilestone");

import { useActiveMilestone } from "@/shared/hooks/useActiveMilestone";
import { useBoardMilestoneFilter } from "./useBoardMilestoneFilter";

const mockUseActiveMilestone = vi.mocked(useActiveMilestone);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeActiveMilestone(id = "m-active"): Milestone {
  return {
    id,
    name: "Active Sprint",
    description: null,
    project_id: "proj-1",
    status: "active",
    story_count: 3,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

type UseQueryResult = { data: Milestone | null; isLoading: boolean };

function mockQuery(result: UseQueryResult) {
  mockUseActiveMilestone.mockReturnValue(result as ReturnType<typeof useActiveMilestone>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useBoardMilestoneFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activeMilestoneId is null when no active milestone exists", () => {
    mockQuery({ data: null, isLoading: false });

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    expect(result.current.activeMilestoneId).toBeNull();
  });

  it("activeMilestone is null when no active milestone exists", () => {
    mockQuery({ data: null, isLoading: false });

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    expect(result.current.activeMilestone).toBeNull();
  });

  it("showingAll starts as false regardless of active milestone", () => {
    mockQuery({ data: null, isLoading: false });

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    expect(result.current.showingAll).toBe(false);
  });

  it("isLoading reflects the underlying query loading state (true)", () => {
    mockQuery({ data: null, isLoading: true });

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    expect(result.current.isLoading).toBe(true);
  });

  it("isLoading reflects the underlying query loading state (false)", () => {
    mockQuery({ data: null, isLoading: false });

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    expect(result.current.isLoading).toBe(false);
  });

  it("activeMilestoneId equals the active milestone id when one exists", () => {
    const milestone = makeActiveMilestone("m-active");
    mockQuery({ data: milestone, isLoading: false });

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    expect(result.current.activeMilestoneId).toBe("m-active");
  });

  it("activeMilestone is the active milestone object when one exists", () => {
    const milestone = makeActiveMilestone();
    mockQuery({ data: milestone, isLoading: false });

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    expect(result.current.activeMilestone).toBe(milestone);
  });

  it("handleShowAll sets showingAll to true", () => {
    const milestone = makeActiveMilestone();
    mockQuery({ data: milestone, isLoading: false });

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    act(() => {
      result.current.handleShowAll();
    });

    expect(result.current.showingAll).toBe(true);
  });

  it("activeMilestoneId becomes null after handleShowAll", () => {
    const milestone = makeActiveMilestone();
    mockQuery({ data: milestone, isLoading: false });

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    act(() => {
      result.current.handleShowAll();
    });

    expect(result.current.activeMilestoneId).toBeNull();
  });

  it("activeMilestone becomes null after handleShowAll (filter dismissed)", () => {
    const milestone = makeActiveMilestone();
    mockQuery({ data: milestone, isLoading: false });

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    act(() => {
      result.current.handleShowAll();
    });

    expect(result.current.activeMilestone).toBeNull();
  });

  it("showingAll resets to false when projectId changes", () => {
    const milestone = makeActiveMilestone();
    mockQuery({ data: milestone, isLoading: false });

    const { result, rerender } = renderHook(
      ({ projectId }: { projectId: string }) => useBoardMilestoneFilter(projectId),
      { initialProps: { projectId: "proj-1" } },
    );

    act(() => {
      result.current.handleShowAll();
    });
    expect(result.current.showingAll).toBe(true);

    // Simulate navigating to a different project.
    rerender({ projectId: "proj-2" });

    expect(result.current.showingAll).toBe(false);
  });

  it("activeMilestoneId returns null when showingAll is true even if active milestone exists", () => {
    const milestone = makeActiveMilestone();
    mockQuery({ data: milestone, isLoading: false });

    const { result } = renderHook(() => useBoardMilestoneFilter("proj-1"));

    act(() => {
      result.current.handleShowAll();
    });

    // Even though activeMilestone data exists in the query, the filter is dismissed.
    expect(result.current.activeMilestoneId).toBeNull();
  });
});
