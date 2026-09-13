/**
 * useResizablePanel — unit tests (STORY-006 / TASK-008)
 *
 * Covers `clampPanelWidth`'s range arithmetic directly, and the
 * `useResizablePanel` hook via `renderHook`: seeding from the module-level
 * width map vs. `defaultWidth`, each commit path (`resizeTo`, `resizeBy`,
 * `resizeToPointer`), the fall-back-to-default signal for a too-narrow
 * container, restoring a clamped-down width once the container widens again,
 * per-key independence, and cross-remount persistence.
 *
 * jsdom implements no `ResizeObserver` and performs no layout — `clientWidth`
 * and `getBoundingClientRect()` both read as 0 — so both are stubbed per
 * fake container element created by `makeContainer`, and a fake
 * `ResizeObserver` is stubbed globally so a "container resized" callback can
 * be triggered manually.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetPanelWidths,
  clampPanelWidth,
  useResizablePanel,
} from "./useResizablePanel";

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  callback: ResizeObserverCallback;
  observed: Element | null = null;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observed = target;
  }

  unobserve() {
    this.observed = null;
  }

  disconnect() {
    this.observed = null;
  }

  /** Test helper: simulate the browser firing a resize callback. */
  trigger() {
    this.callback(
      [{ target: this.observed } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}

function makeContainer(
  clientWidth: number,
  rect: Partial<DOMRect> = {},
): HTMLDivElement {
  const node = document.createElement("div");
  Object.defineProperty(node, "clientWidth", {
    value: clientWidth,
    configurable: true,
  });
  node.getBoundingClientRect = () =>
    ({
      left: 0,
      right: clientWidth,
      top: 0,
      bottom: 0,
      width: clientWidth,
      height: 0,
      x: 0,
      y: 0,
      toJSON() {},
      ...rect,
    }) as DOMRect;
  return node;
}

describe("clampPanelWidth", () => {
  it("returns the desired width unchanged when it is inside the valid range", () => {
    expect(clampPanelWidth(300, 200, 500, 1000, 200)).toBe(300);
  });

  it("clamps to minWidth when the desired width is below the floor", () => {
    expect(clampPanelWidth(100, 200, 500, 1000, 200)).toBe(200);
  });

  it("clamps to maxWidth when the desired width is above the ceiling", () => {
    expect(clampPanelWidth(900, 200, 500, 1000, 200)).toBe(500);
  });

  it("clamps to the container-minus-neighbour ceiling when it is tighter than maxWidth", () => {
    // container 700, neighbour min 300 => ceiling 400, tighter than maxWidth 500
    expect(clampPanelWidth(450, 200, 500, 700, 300)).toBe(400);
  });

  it("returns null when the valid range is empty (ceiling below the floor)", () => {
    // container 400, neighbour min 300 => ceiling 100, below minWidth 200
    expect(clampPanelWidth(250, 200, 500, 400, 300)).toBeNull();
  });

  it("returns null when the container has not been measured yet", () => {
    expect(clampPanelWidth(300, 200, 500, 0, 200)).toBeNull();
  });
});

describe("useResizablePanel", () => {
  const baseOptions = {
    storageKey: "test-pair",
    defaultWidth: 300,
    minWidth: 200,
    maxWidth: 500,
    neighbourMinWidth: 200,
    side: "left" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    __resetPanelWidths();
    FakeResizeObserver.instances = [];
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("seeds width from defaultWidth when no entry exists for the key", () => {
    const { result } = renderHook(() => useResizablePanel(baseOptions));

    act(() => {
      result.current.containerRef(makeContainer(1000));
    });

    expect(result.current.width).toBe(300);
  });

  it("seeds width from the module map when an entry exists for the key", () => {
    const { result: seed } = renderHook(() => useResizablePanel(baseOptions));
    act(() => {
      seed.current.containerRef(makeContainer(1000));
    });
    act(() => {
      seed.current.resizeTo(350);
    });

    const { result } = renderHook(() => useResizablePanel(baseOptions));
    act(() => {
      result.current.containerRef(makeContainer(1000));
    });

    expect(result.current.width).toBe(350);
  });

  it("clamps a committed width outside the valid range to the nearer bound", () => {
    const { result } = renderHook(() => useResizablePanel(baseOptions));
    act(() => {
      result.current.containerRef(makeContainer(1000));
    });

    act(() => {
      result.current.resizeTo(50);
    });
    expect(result.current.width).toBe(200);

    act(() => {
      result.current.resizeTo(900);
    });
    expect(result.current.width).toBe(500);
  });

  it("renders width null when the container is too narrow for both minimums", () => {
    const { result } = renderHook(() => useResizablePanel(baseOptions));

    act(() => {
      result.current.containerRef(makeContainer(350));
    });

    expect(result.current.width).toBeNull();
  });

  it("restores a chosen width in full once a narrowed container widens again", () => {
    const { result } = renderHook(() => useResizablePanel(baseOptions));
    const container = makeContainer(1000);
    act(() => {
      result.current.containerRef(container);
    });
    act(() => {
      result.current.resizeTo(450);
    });
    expect(result.current.width).toBe(450);

    // Narrow the container: ceiling (500 - 200 = 300) drops below the chosen width.
    Object.defineProperty(container, "clientWidth", {
      value: 500,
      configurable: true,
    });
    act(() => {
      FakeResizeObserver.instances[0].trigger();
    });
    expect(result.current.width).toBe(300);

    // Widen it back past the chosen width.
    Object.defineProperty(container, "clientWidth", {
      value: 1000,
      configurable: true,
    });
    act(() => {
      FakeResizeObserver.instances[0].trigger();
    });
    expect(result.current.width).toBe(450);
  });

  it("holds independent widths for two hook instances with different storage keys", () => {
    const { result: a } = renderHook(() =>
      useResizablePanel({ ...baseOptions, storageKey: "pair-a" }),
    );
    const { result: b } = renderHook(() =>
      useResizablePanel({ ...baseOptions, storageKey: "pair-b" }),
    );

    act(() => {
      a.current.containerRef(makeContainer(1000));
      b.current.containerRef(makeContainer(1000));
    });
    act(() => {
      a.current.resizeTo(400);
    });

    expect(a.current.width).toBe(400);
    expect(b.current.width).toBe(300);
  });

  it("keeps a committed width after the hook instance unmounts and remounts under the same key", () => {
    const { result, unmount } = renderHook(() =>
      useResizablePanel(baseOptions),
    );
    act(() => {
      result.current.containerRef(makeContainer(1000));
    });
    act(() => {
      result.current.resizeTo(420);
    });
    unmount();

    const { result: remounted } = renderHook(() =>
      useResizablePanel(baseOptions),
    );
    act(() => {
      remounted.current.containerRef(makeContainer(1000));
    });

    expect(remounted.current.width).toBe(420);
  });

  it("commits resizeBy as an increment on top of the current desired width", () => {
    const { result } = renderHook(() => useResizablePanel(baseOptions));
    act(() => {
      result.current.containerRef(makeContainer(1000));
    });

    act(() => {
      result.current.resizeBy(50);
    });
    expect(result.current.width).toBe(350);

    act(() => {
      result.current.resizeBy(-30);
    });
    expect(result.current.width).toBe(320);
  });

  it("resizeToPointer computes width from the pointer position for a left-controlled panel", () => {
    const container = makeContainer(1000, { left: 100, right: 1100 });
    const { result } = renderHook(() =>
      useResizablePanel({ ...baseOptions, side: "left" }),
    );
    act(() => {
      result.current.containerRef(container);
    });

    act(() => {
      result.current.resizeToPointer(350);
    });

    expect(result.current.width).toBe(250); // 350 - rect.left(100)
  });

  it("resizeToPointer inverts the arithmetic for a right-controlled panel", () => {
    const container = makeContainer(1000, { left: 100, right: 1100 });
    const { result } = renderHook(() =>
      useResizablePanel({ ...baseOptions, side: "right" }),
    );
    act(() => {
      result.current.containerRef(container);
    });

    act(() => {
      result.current.resizeToPointer(850);
    });

    expect(result.current.width).toBe(250); // rect.right(1100) - 850
  });

  it("returns the effective ceiling as maxWidth, tightened by the neighbour's minimum", () => {
    const { result } = renderHook(() => useResizablePanel(baseOptions));

    act(() => {
      result.current.containerRef(makeContainer(600));
    });

    expect(result.current.maxWidth).toBe(400); // min(500, 600 - 200)
  });
});
