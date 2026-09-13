/**
 * useResizablePanel — session-scoped width model for a drag-resizable panel
 * pair (a controlled panel beside a fixed-role neighbour, separated by a
 * `ResizeHandle`). Owns geometry, clamping, and storage only — no DOM event
 * handling; TASK-009's `ResizeHandle` supplies the pointer/keyboard events
 * and calls back into this hook's commit functions.
 *
 * The width the user chose lives in a module-level map keyed by
 * `storageKey`, not in the clamped value that gets rendered — so widening
 * the container after a clamp-induced squeeze restores the full chosen width
 * rather than the narrower one it was displayed at. The map is module-level
 * (not component state) so it outlives the component's own unmount
 * (`StorySlideOver` unmounts on close; `AppShell` unmounts when the user
 * switches to Sessions mode), and it is never persisted to `localStorage` or
 * `sessionStorage` — a page reload must return every pair to its default
 * width.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

/** Which side of the separator the controlled panel sits on. */
export type PanelSide = "left" | "right";

export interface UseResizablePanelOptions {
  /** Key this pair's chosen width is stored under in the module-level map. */
  storageKey: string;
  /** Width to render before any resize has been committed for this key. */
  defaultWidth: number;
  /** Lower bound of the controlled panel's own valid width. */
  minWidth: number;
  /** Upper bound of the controlled panel's own valid width. */
  maxWidth: number;
  /** The neighbour panel's own minimum — reserved out of the container width. */
  neighbourMinWidth: number;
  /** Which side of the separator the controlled panel sits on. */
  side: PanelSide;
}

export interface UseResizablePanelResult {
  /** Ref callback the caller attaches to the flex row holding both panels. */
  containerRef: (node: HTMLDivElement | null) => void;
  /** Pixel width to apply to the controlled panel, or `null` to fall back to its default. */
  width: number | null;
  /** Currently effective upper bound, for the separator's `aria-valuemax`. */
  maxWidth: number;
  /** Converts a pointer X coordinate into a width and commits it. */
  resizeToPointer: (clientX: number) => void;
  /** Commits the current width plus `deltaPx` (positive always grows the controlled panel). */
  resizeBy: (deltaPx: number) => void;
  /** Commits an absolute width. */
  resizeTo: (width: number) => void;
}

/**
 * clampPanelWidth — pulls `desired` into the valid range for a panel pair, or
 * signals no valid width exists.
 *
 * The valid range is `minWidth` to `min(maxWidth, containerWidth -
 * neighbourMinWidth)`. A desired value outside it is pulled to the nearer
 * end. When the upper bound falls below `minWidth` (the container is too
 * narrow to hold both panels' minimums) or the container has not been
 * measured yet (`containerWidth === 0`), this returns `null` — the pair's
 * fall-back-to-default signal.
 *
 * Exported for direct unit testing; also used internally by `useResizablePanel`.
 */
export function clampPanelWidth(
  desired: number,
  minWidth: number,
  maxWidth: number,
  containerWidth: number,
  neighbourMinWidth: number,
): number | null {
  if (containerWidth === 0) return null;

  const effectiveMax = Math.min(maxWidth, containerWidth - neighbourMinWidth);
  if (effectiveMax < minWidth) return null;

  if (desired < minWidth) return minWidth;
  if (desired > effectiveMax) return effectiveMax;
  return desired;
}

/**
 * The width the user chose per panel pair, keyed by `storageKey`. Holds the
 * unclamped desired value, never the clamped projection rendered for a
 * narrowed container — module-level so it outlives the owning component's
 * unmount, and never written to `localStorage`/`sessionStorage` so it dies
 * on reload.
 */
const panelWidths = new Map<string, number>();

/**
 * Clears the module-level width map. Exported for tests only — no
 * application code calls this.
 */
export function __resetPanelWidths(): void {
  panelWidths.clear();
}

/**
 * useResizablePanel — see module doc.
 */
export function useResizablePanel(
  options: UseResizablePanelOptions,
): UseResizablePanelResult {
  const { storageKey, defaultWidth, minWidth, maxWidth, neighbourMinWidth, side } =
    options;

  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(
    null,
  );
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerNode(node);
  }, []);

  const [containerWidth, setContainerWidth] = useState(0);
  const [desiredWidth, setDesiredWidth] = useState(
    () => panelWidths.get(storageKey) ?? defaultWidth,
  );

  // Measure the container synchronously once attached, then keep the
  // measurement current via ResizeObserver so a window resize re-runs the
  // same clamp a drag does.
  useEffect(() => {
    if (!containerNode) return;

    setContainerWidth(containerNode.clientWidth);

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setContainerWidth(containerNode.clientWidth);
    });
    observer.observe(containerNode);
    return () => observer.disconnect();
  }, [containerNode]);

  const effectiveMaxWidth = Math.min(
    maxWidth,
    containerWidth - neighbourMinWidth,
  );

  const width = useMemo(
    () =>
      clampPanelWidth(
        desiredWidth,
        minWidth,
        maxWidth,
        containerWidth,
        neighbourMinWidth,
      ),
    [desiredWidth, minWidth, maxWidth, containerWidth, neighbourMinWidth],
  );

  const commit = useCallback(
    (rawWidth: number) => {
      panelWidths.set(storageKey, rawWidth);
      setDesiredWidth(rawWidth);
    },
    [storageKey],
  );

  const resizeToPointer = useCallback(
    (clientX: number) => {
      if (!containerNode) return;
      const rect = containerNode.getBoundingClientRect();
      const raw = side === "left" ? clientX - rect.left : rect.right - clientX;
      commit(raw);
    },
    [containerNode, side, commit],
  );

  const resizeBy = useCallback(
    (deltaPx: number) => {
      commit(desiredWidth + deltaPx);
    },
    [commit, desiredWidth],
  );

  const resizeTo = useCallback(
    (absoluteWidth: number) => {
      commit(absoluteWidth);
    },
    [commit],
  );

  return {
    containerRef,
    width,
    maxWidth: effectiveMaxWidth,
    resizeToPointer,
    resizeBy,
    resizeTo,
  };
}
