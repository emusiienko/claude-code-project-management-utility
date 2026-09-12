/**
 * ResizeHandle — draggable separator rendered as a real flex sibling between
 * two panels. It renders the 1px divider itself and forwards every pointer
 * and keyboard event to the `useResizablePanel` callbacks the caller
 * supplies — it holds no width state of its own. See
 * `@/shared/hooks/useResizablePanel` for the width model this component
 * drives.
 */
import { useEffect, useRef } from "react";

/** Pixel step ArrowLeft/ArrowRight nudge the controlled panel by. */
export const NUDGE_STEP_PX = 16;

export interface ResizeHandleProps {
  /** Accessible name for the separator, e.g. "Resize project sidebar". */
  ariaLabel: string;
  /** DOM id of the panel this separator resizes. */
  controlsId: string;
  /** Current width of the controlled panel — published as `aria-valuenow`. */
  width: number;
  /** Lower bound of the controlled panel's width — published as `aria-valuemin`. */
  min: number;
  /** Upper bound of the controlled panel's width — published as `aria-valuemax`. */
  max: number;
  /** Which side of the separator the controlled panel sits on. */
  side: "left" | "right";
  /** Forwards a pointer drag's clientX to the width hook. */
  onResizeToPointer: (clientX: number) => void;
  /** Forwards a keyboard nudge — positive always grows the controlled panel. */
  onResizeBy: (deltaPx: number) => void;
  /** Forwards an absolute jump (Home/End). */
  onResizeTo: (width: number) => void;
}

/**
 * Clears the document-wide cursor/selection suppression a drag applies.
 * Shared by the pointer-up handler and the unmount-cleanup effect below so
 * both paths restore the same state.
 */
function restoreBodyStyles() {
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
}

/**
 * ResizeHandle — see module doc.
 */
export function ResizeHandle({
  ariaLabel,
  controlsId,
  width,
  min,
  max,
  side,
  onResizeToPointer,
  onResizeBy,
  onResizeTo,
}: ResizeHandleProps) {
  const draggingRef = useRef(false);

  // If the component unmounts mid-drag (e.g. the pair collapses while the
  // pointer is still down), no pointerup ever fires — restore the
  // document-wide styles here too.
  useEffect(() => {
    return () => {
      if (draggingRef.current) {
        restoreBodyStyles();
      }
    };
  }, []);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    onResizeToPointer(event.clientX);
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    draggingRef.current = false;
    restoreBodyStyles();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    // ArrowRight always points the way growth reads on screen: it grows a
    // left-controlled panel and shrinks a right-controlled one.
    const growSign = side === "left" ? 1 : -1;

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        onResizeBy(growSign * NUDGE_STEP_PX);
        break;
      case "ArrowLeft":
        event.preventDefault();
        onResizeBy(-growSign * NUDGE_STEP_PX);
        break;
      case "Home":
        event.preventDefault();
        onResizeTo(min);
        break;
      case "End":
        event.preventDefault();
        onResizeTo(max);
        break;
      default:
        break;
    }
  }

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-controls={controlsId}
      aria-label={ariaLabel}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
      className="relative flex-none w-px touch-none cursor-col-resize bg-border outline-none after:absolute after:inset-y-0 after:-left-1 after:-right-1 after:content-[''] focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    />
  );
}
