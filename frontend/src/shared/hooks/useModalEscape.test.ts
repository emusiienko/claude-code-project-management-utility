/**
 * useModalEscape — unit tests
 *
 * Regression coverage for BUG-004 (STORY-007): a single Escape keydown must
 * close only the topmost modal in a layered stack, and unmounting that modal
 * must correctly reveal the next-topmost host as the new Escape target —
 * without each host needing its own capture/bubble-phase listener.
 */

import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useModalEscape } from "./useModalEscape";

function pressEscape() {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
  });
}

describe("useModalEscape", () => {
  afterEach(() => {
    // Guard against a leaking stack entry across tests if a hook fails to
    // unmount cleanly mid-assertion.
    vi.restoreAllMocks();
  });

  it("calls onClose when Escape is pressed while the modal is the only entry", () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() => useModalEscape(onClose));

    pressEscape();

    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("does not call onClose after the modal has unmounted", () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() => useModalEscape(onClose));
    unmount();

    pressEscape();

    expect(onClose).not.toHaveBeenCalled();
  });

  it("three-deep stack: Escape closes only the topmost modal (viewer over Task Detail Modal over Story slide-over)", () => {
    // Mirrors BUG-004's exact repro: Story slide-over mounts first, then the
    // Task Detail Modal on top of it, then the attachment viewer on top of
    // that. A single Escape press must close only the viewer.
    const onCloseStorySlideOver = vi.fn();
    const onCloseTaskDetailModal = vi.fn();
    const onCloseViewer = vi.fn();

    const storySlideOver = renderHook(() => useModalEscape(onCloseStorySlideOver));
    const taskDetailModal = renderHook(() => useModalEscape(onCloseTaskDetailModal));
    const viewer = renderHook(() => useModalEscape(onCloseViewer));

    pressEscape();

    expect(onCloseViewer).toHaveBeenCalledTimes(1);
    expect(onCloseTaskDetailModal).not.toHaveBeenCalled();
    expect(onCloseStorySlideOver).not.toHaveBeenCalled();

    // Simulate the viewer actually closing (unmounting) in response.
    viewer.unmount();

    // The next Escape now targets the Task Detail Modal, not the slide-over.
    pressEscape();

    expect(onCloseTaskDetailModal).toHaveBeenCalledTimes(1);
    expect(onCloseStorySlideOver).not.toHaveBeenCalled();

    taskDetailModal.unmount();

    // Finally, the Story slide-over is the last host standing.
    pressEscape();

    expect(onCloseStorySlideOver).toHaveBeenCalledTimes(1);

    storySlideOver.unmount();
  });

  it("an inactive modal (isActive=false) does not participate in the stack", () => {
    const onCloseActive = vi.fn();
    const onCloseInactive = vi.fn();

    const inactive = renderHook(() => useModalEscape(onCloseInactive, false));
    const active = renderHook(() => useModalEscape(onCloseActive, true));

    pressEscape();

    expect(onCloseActive).toHaveBeenCalledTimes(1);
    expect(onCloseInactive).not.toHaveBeenCalled();

    active.unmount();
    inactive.unmount();
  });

  it("always calls the latest onClose reference without requiring the caller to memoize it", () => {
    const firstOnClose = vi.fn();
    const secondOnClose = vi.fn();

    const { rerender, unmount } = renderHook(
      ({ onClose }) => useModalEscape(onClose),
      { initialProps: { onClose: firstOnClose } },
    );

    rerender({ onClose: secondOnClose });

    pressEscape();

    expect(secondOnClose).toHaveBeenCalledTimes(1);
    expect(firstOnClose).not.toHaveBeenCalled();
    unmount();
  });
});
