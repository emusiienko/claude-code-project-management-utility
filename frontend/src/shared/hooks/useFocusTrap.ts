/**
 * useFocusTrap — moves keyboard focus into a modal/dialog container on mount,
 * cycles Tab/Shift+Tab among the container's own focusable elements so focus
 * never escapes to the page behind it, and restores focus to whatever was
 * focused before the modal opened once it unmounts (or is deactivated).
 *
 * @param containerRef - Ref to the modal's root DOM node. The node itself
 *                        should carry `tabIndex={-1}` so it is a valid focus
 *                        target when it contains no focusable children.
 * @param isActive      - Whether the trap should be engaged (defaults to true).
 */
import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive = true,
) {
  useEffect(() => {
    if (!isActive) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    function getFocusable(): HTMLElement[] {
      return Array.from(
        container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
    }

    const initialFocusable = getFocusable();
    (initialFocusable[0] ?? container).focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [containerRef, isActive]);
}
