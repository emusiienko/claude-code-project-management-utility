/**
 * ResizeHandle — component tests (STORY-006 / TASK-009)
 *
 * jsdom implements neither `setPointerCapture` nor
 * `releasePointerCapture` — both are stubbed on `HTMLElement.prototype` for
 * each test and removed in `afterEach`, per Coding Conventions § Testing >
 * Mocking boundary. A drag also mutates `document.body.style` (global
 * state) — restored in `afterEach` so no later test inherits a leftover
 * cursor or selection suppression.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NUDGE_STEP_PX,
  ResizeHandle,
  type ResizeHandleProps,
} from "./ResizeHandle";

function renderHandle(overrides: Partial<ResizeHandleProps> = {}) {
  const onResizeToPointer = vi.fn();
  const onResizeBy = vi.fn();
  const onResizeTo = vi.fn();

  const props: ResizeHandleProps = {
    ariaLabel: "Resize project sidebar",
    controlsId: "project-sidebar",
    width: 240,
    min: 180,
    max: 480,
    side: "left",
    onResizeToPointer,
    onResizeBy,
    onResizeTo,
    ...overrides,
  };

  render(<ResizeHandle {...props} />);
  const separator = screen.getByRole("separator", { name: props.ariaLabel });

  return { separator, onResizeToPointer, onResizeBy, onResizeTo };
}

describe("ResizeHandle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    // @ts-expect-error — jsdom implements neither method at all
    delete HTMLElement.prototype.setPointerCapture;
    // @ts-expect-error — jsdom implements neither method at all
    delete HTMLElement.prototype.releasePointerCapture;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  });

  it("is reachable by role with its accessible name and exposes the aria-value* triplet", () => {
    const { separator } = renderHandle({ width: 300, min: 200, max: 500 });

    expect(separator).toHaveAttribute("aria-orientation", "vertical");
    expect(separator).toHaveAttribute("aria-controls", "project-sidebar");
    expect(separator).toHaveAttribute("aria-valuenow", "300");
    expect(separator).toHaveAttribute("aria-valuemin", "200");
    expect(separator).toHaveAttribute("aria-valuemax", "500");
    expect(separator).toHaveAttribute("tabindex", "0");
  });

  it("shows a column-resize cursor before any drag begins", () => {
    const { separator } = renderHandle();

    expect(separator.className).toContain("cursor-col-resize");
  });

  it("forwards every intermediate clientX to onResizeToPointer during a pointer drag", async () => {
    const user = userEvent.setup();
    const { separator, onResizeToPointer } = renderHandle();

    await user.pointer([
      {
        target: separator,
        keys: "[MouseLeft>]",
        coords: { clientX: 100, clientY: 0 },
      },
      { target: separator, coords: { clientX: 150, clientY: 0 } },
      { target: separator, coords: { clientX: 220, clientY: 0 } },
      { target: separator, keys: "[/MouseLeft]" },
    ]);

    expect(onResizeToPointer).toHaveBeenNthCalledWith(1, 150);
    expect(onResizeToPointer).toHaveBeenNthCalledWith(2, 220);
    expect(onResizeToPointer).toHaveBeenCalledTimes(2);
  });

  it("stops forwarding pointer moves once the pointer is released", async () => {
    const user = userEvent.setup();
    const { separator, onResizeToPointer } = renderHandle();

    await user.pointer([
      {
        target: separator,
        keys: "[MouseLeft>]",
        coords: { clientX: 100, clientY: 0 },
      },
      { target: separator, coords: { clientX: 150, clientY: 0 } },
      { target: separator, keys: "[/MouseLeft]" },
    ]);
    onResizeToPointer.mockClear();

    await user.pointer([
      { target: separator, coords: { clientX: 400, clientY: 0 } },
    ]);

    expect(onResizeToPointer).not.toHaveBeenCalled();
  });

  it("captures the pointer on pointerdown, so the drag keeps tracking off the separator", async () => {
    const user = userEvent.setup();
    const { separator } = renderHandle();

    await user.pointer({ target: separator, keys: "[MouseLeft>]" });

    expect(separator.setPointerCapture).toHaveBeenCalled();
  });

  it("releases the pointer capture on pointerup", async () => {
    const user = userEvent.setup();
    const { separator } = renderHandle();

    await user.pointer([
      { target: separator, keys: "[MouseLeft>]" },
      { target: separator, keys: "[/MouseLeft]" },
    ]);

    expect(separator.releasePointerCapture).toHaveBeenCalled();
  });

  it.each([
    ["left" as const, "ArrowRight", NUDGE_STEP_PX],
    ["left" as const, "ArrowLeft", -NUDGE_STEP_PX],
    ["right" as const, "ArrowRight", -NUDGE_STEP_PX],
    ["right" as const, "ArrowLeft", NUDGE_STEP_PX],
  ])(
    "side=%s: %s calls onResizeBy(%d)",
    async (side, key, expectedDelta) => {
      const user = userEvent.setup();
      const { separator, onResizeBy } = renderHandle({ side });
      separator.focus();

      await user.keyboard(`{${key}}`);

      expect(onResizeBy).toHaveBeenCalledWith(expectedDelta);
    },
  );

  it("Home moves the separator to min", async () => {
    const user = userEvent.setup();
    const { separator, onResizeTo } = renderHandle({ min: 180 });
    separator.focus();

    await user.keyboard("{Home}");

    expect(onResizeTo).toHaveBeenCalledWith(180);
  });

  it("End moves the separator to max", async () => {
    const user = userEvent.setup();
    const { separator, onResizeTo } = renderHandle({ max: 480 });
    separator.focus();

    await user.keyboard("{End}");

    expect(onResizeTo).toHaveBeenCalledWith(480);
  });

  it("leaves no inline user-select or cursor on document.body after a drag ends", async () => {
    const user = userEvent.setup();
    const { separator } = renderHandle();

    await user.pointer([
      {
        target: separator,
        keys: "[MouseLeft>]",
        coords: { clientX: 100, clientY: 0 },
      },
      { target: separator, coords: { clientX: 150, clientY: 0 } },
      { target: separator, keys: "[/MouseLeft]" },
    ]);

    expect(document.body.style.userSelect).toBe("");
    expect(document.body.style.cursor).toBe("");
  });

  it("leaves no inline user-select or cursor on document.body if the component unmounts mid-drag", async () => {
    const user = userEvent.setup();
    const onResizeToPointer = vi.fn();
    const { unmount } = render(
      <ResizeHandle
        ariaLabel="Resize project sidebar"
        controlsId="project-sidebar"
        width={240}
        min={180}
        max={480}
        side="left"
        onResizeToPointer={onResizeToPointer}
        onResizeBy={vi.fn()}
        onResizeTo={vi.fn()}
      />,
    );
    const separator = screen.getByRole("separator");

    await user.pointer({
      target: separator,
      keys: "[MouseLeft>]",
      coords: { clientX: 100, clientY: 0 },
    });
    expect(document.body.style.cursor).toBe("col-resize");

    unmount();

    expect(document.body.style.userSelect).toBe("");
    expect(document.body.style.cursor).toBe("");
  });
});
