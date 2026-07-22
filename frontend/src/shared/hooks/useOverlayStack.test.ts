/**
 * useOverlayStack — unit tests (STORY-022 Revision 3 / TASK-011)
 *
 * Covers the overlay stack mechanics in isolation from any rendering:
 * - Initial state is "none".
 * - openProjects() opens the Projects stack at its root (the project list).
 * - openConfig() opens the single-level Config stack.
 * - openProjectSettings() pushes a Settings level onto an open Projects stack;
 *   a no-op when Projects isn't the open overlay (Config or none).
 * - back() pops one level when depth exists; a no-op at the root.
 * - dismiss() clears the whole stack in one action, from any level.
 * - hasOverlayDepth(): false at the Projects root and for Config (single
 *   level, no Back); true once a project's Settings has been pushed.
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { hasOverlayDepth, useOverlayStack } from "./useOverlayStack";

describe("useOverlayStack", () => {
  it("starts with the overlay closed", () => {
    const { result } = renderHook(() => useOverlayStack());
    expect(result.current.state).toEqual({ kind: "none" });
  });

  it("openProjects() opens the Projects stack at its root (the project list)", () => {
    const { result } = renderHook(() => useOverlayStack());
    act(() => result.current.openProjects());
    expect(result.current.state).toEqual({
      kind: "projects",
      stack: [{ screen: "list" }],
    });
  });

  it("openConfig() opens the single-level Config stack", () => {
    const { result } = renderHook(() => useOverlayStack());
    act(() => result.current.openConfig());
    expect(result.current.state).toEqual({ kind: "config" });
  });

  it("openProjectSettings() pushes a Settings level onto an open Projects stack", () => {
    const { result } = renderHook(() => useOverlayStack());
    act(() => result.current.openProjects());
    act(() => result.current.openProjectSettings("proj-1"));
    expect(result.current.state).toEqual({
      kind: "projects",
      stack: [{ screen: "list" }, { screen: "settings", projectId: "proj-1" }],
    });
  });

  it("openProjectSettings() is a no-op when the overlay is closed", () => {
    const { result } = renderHook(() => useOverlayStack());
    act(() => result.current.openProjectSettings("proj-1"));
    expect(result.current.state).toEqual({ kind: "none" });
  });

  it("openProjectSettings() is a no-op when the Config overlay is open instead", () => {
    const { result } = renderHook(() => useOverlayStack());
    act(() => result.current.openConfig());
    act(() => result.current.openProjectSettings("proj-1"));
    expect(result.current.state).toEqual({ kind: "config" });
  });

  it("back() pops the Settings level, returning to the project list", () => {
    const { result } = renderHook(() => useOverlayStack());
    act(() => result.current.openProjects());
    act(() => result.current.openProjectSettings("proj-1"));
    act(() => result.current.back());
    expect(result.current.state).toEqual({
      kind: "projects",
      stack: [{ screen: "list" }],
    });
  });

  it("back() is a no-op at the Projects root", () => {
    const { result } = renderHook(() => useOverlayStack());
    act(() => result.current.openProjects());
    act(() => result.current.back());
    expect(result.current.state).toEqual({
      kind: "projects",
      stack: [{ screen: "list" }],
    });
  });

  it("back() is a no-op on the single-level Config stack", () => {
    const { result } = renderHook(() => useOverlayStack());
    act(() => result.current.openConfig());
    act(() => result.current.back());
    expect(result.current.state).toEqual({ kind: "config" });
  });

  it("dismiss() clears the whole stack from the Projects root", () => {
    const { result } = renderHook(() => useOverlayStack());
    act(() => result.current.openProjects());
    act(() => result.current.dismiss());
    expect(result.current.state).toEqual({ kind: "none" });
  });

  it("dismiss() clears the whole stack from the Settings level (not just one level, unlike back())", () => {
    const { result } = renderHook(() => useOverlayStack());
    act(() => result.current.openProjects());
    act(() => result.current.openProjectSettings("proj-1"));
    act(() => result.current.dismiss());
    expect(result.current.state).toEqual({ kind: "none" });
  });

  it("dismiss() clears the single-level Config stack", () => {
    const { result } = renderHook(() => useOverlayStack());
    act(() => result.current.openConfig());
    act(() => result.current.dismiss());
    expect(result.current.state).toEqual({ kind: "none" });
  });

  it("re-opening Projects after a dismiss resets back to the root list (no stale depth)", () => {
    const { result } = renderHook(() => useOverlayStack());
    act(() => result.current.openProjects());
    act(() => result.current.openProjectSettings("proj-1"));
    act(() => result.current.dismiss());
    act(() => result.current.openProjects());
    expect(result.current.state).toEqual({
      kind: "projects",
      stack: [{ screen: "list" }],
    });
  });
});

describe("hasOverlayDepth", () => {
  it("is false when the overlay is closed", () => {
    expect(hasOverlayDepth({ kind: "none" })).toBe(false);
  });

  it("is false at the Projects root (list only) — Back should not render", () => {
    expect(hasOverlayDepth({ kind: "projects", stack: [{ screen: "list" }] })).toBe(false);
  });

  it("is true once a project's Settings has been pushed — Back should render", () => {
    expect(
      hasOverlayDepth({
        kind: "projects",
        stack: [{ screen: "list" }, { screen: "settings", projectId: "proj-1" }],
      }),
    ).toBe(true);
  });

  it("is false for the single-level Config stack — Back should not render", () => {
    expect(hasOverlayDepth({ kind: "config" })).toBe(false);
  });
});
