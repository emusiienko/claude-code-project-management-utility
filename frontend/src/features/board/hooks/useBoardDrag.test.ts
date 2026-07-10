/**
 * useBoardDrag — unit tests
 *
 * Covers:
 * - resolveTargetStatus utility: returns status from "col-<status>" prefix,
 *   returns null for non-column ids.
 * - handleDragStart sets activeStoryId.
 * - handleDragEnd same-column drop: no-op (onStatusChange not called).
 * - handleDragEnd valid cross-column drop: onStatusChange called.
 * - handleDragEnd invalid status: onInvalidDrop called, onStatusChange not called.
 * - handleDragEnd no drop target (over is null): no callbacks called.
 * - handleDragEnd on another card (not column droppable): falls back to card status.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useBoardDrag, resolveTargetStatus } from "./useBoardDrag";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDragStartEvent(storyId: string): DragStartEvent {
  return {
    active: { id: storyId, data: { current: { status: "Planned" } }, rect: { current: { initial: null, translated: null } } },
  } as unknown as DragStartEvent;
}

function makeDragEndEvent({
  storyId,
  sourceStatus,
  overId,
  overStatus,
}: {
  storyId: string;
  sourceStatus: string;
  overId: string | null;
  overStatus?: string;
}): DragEndEvent {
  return {
    active: {
      id: storyId,
      data: { current: { status: sourceStatus } },
    },
    over: overId
      ? {
          id: overId,
          data: { current: { status: overStatus } },
        }
      : null,
  } as unknown as DragEndEvent;
}

// ---------------------------------------------------------------------------
// resolveTargetStatus
// ---------------------------------------------------------------------------

describe("resolveTargetStatus", () => {
  it("extracts the status from a col-<status> droppable id", () => {
    expect(resolveTargetStatus("col-In Progress")).toBe("In Progress");
  });

  it("extracts a single-word status", () => {
    expect(resolveTargetStatus("col-Planned")).toBe("Planned");
  });

  it("returns null for a story UUID id", () => {
    expect(resolveTargetStatus("story-uuid-abc")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(resolveTargetStatus("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// useBoardDrag
// ---------------------------------------------------------------------------

describe("useBoardDrag", () => {
  const VALID_STATUSES = ["Planned", "In Progress", "Done"];
  let onStatusChange: (storyId: string, newStatus: string) => void;
  let onInvalidDrop: (storyId: string, attemptedStatus: string) => void;

  beforeEach(() => {
    onStatusChange = vi.fn<(storyId: string, newStatus: string) => void>();
    onInvalidDrop = vi.fn<(storyId: string, attemptedStatus: string) => void>();
  });

  function renderBoardDrag() {
    return renderHook(() =>
      useBoardDrag({
        validStatuses: VALID_STATUSES,
        onStatusChange,
        onInvalidDrop,
      }),
    );
  }

  it("activeStoryId is null on initial render", () => {
    const { result } = renderBoardDrag();
    expect(result.current.activeStoryId).toBeNull();
  });

  it("handleDragStart sets activeStoryId", () => {
    const { result } = renderBoardDrag();
    act(() => {
      result.current.handleDragStart(makeDragStartEvent("story-abc"));
    });
    expect(result.current.activeStoryId).toBe("story-abc");
  });

  it("handleDragEnd clears activeStoryId", () => {
    const { result } = renderBoardDrag();
    act(() => {
      result.current.handleDragStart(makeDragStartEvent("story-abc"));
    });
    act(() => {
      result.current.handleDragEnd(
        makeDragEndEvent({
          storyId: "story-abc",
          sourceStatus: "Planned",
          overId: "col-In Progress",
        }),
      );
    });
    expect(result.current.activeStoryId).toBeNull();
  });

  it("calls onStatusChange on a valid cross-column drop", () => {
    const { result } = renderBoardDrag();
    act(() => {
      result.current.handleDragEnd(
        makeDragEndEvent({
          storyId: "story-abc",
          sourceStatus: "Planned",
          overId: "col-In Progress",
        }),
      );
    });
    expect(onStatusChange).toHaveBeenCalledWith("story-abc", "In Progress");
    expect(onInvalidDrop).not.toHaveBeenCalled();
  });

  it("does not call any callback for a same-column drop", () => {
    const { result } = renderBoardDrag();
    act(() => {
      result.current.handleDragEnd(
        makeDragEndEvent({
          storyId: "story-abc",
          sourceStatus: "Planned",
          overId: "col-Planned",
        }),
      );
    });
    expect(onStatusChange).not.toHaveBeenCalled();
    expect(onInvalidDrop).not.toHaveBeenCalled();
  });

  it("calls onInvalidDrop when target status is not in validStatuses", () => {
    const { result } = renderBoardDrag();
    act(() => {
      result.current.handleDragEnd(
        makeDragEndEvent({
          storyId: "story-abc",
          sourceStatus: "Planned",
          overId: "col-Deleted", // not in VALID_STATUSES
        }),
      );
    });
    expect(onInvalidDrop).toHaveBeenCalledWith("story-abc", "Deleted");
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it("does nothing when over is null (drop outside any column)", () => {
    const { result } = renderBoardDrag();
    act(() => {
      result.current.handleDragEnd(
        makeDragEndEvent({
          storyId: "story-abc",
          sourceStatus: "Planned",
          overId: null,
        }),
      );
    });
    expect(onStatusChange).not.toHaveBeenCalled();
    expect(onInvalidDrop).not.toHaveBeenCalled();
  });

  it("falls back to card status when dropped on another story card", () => {
    const { result } = renderBoardDrag();
    act(() => {
      result.current.handleDragEnd(
        makeDragEndEvent({
          storyId: "story-abc",
          sourceStatus: "Planned",
          overId: "story-xyz",        // not a col-* id
          overStatus: "In Progress",  // card's own status via data.current.status
        }),
      );
    });
    expect(onStatusChange).toHaveBeenCalledWith("story-abc", "In Progress");
  });
});
