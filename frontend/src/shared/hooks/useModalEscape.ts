/**
 * useModalEscape — coordinated Escape-key handling for stacked modals/panels.
 *
 * Layered hosts (e.g. the Story slide-over, the Task Detail Modal mounted on
 * top of it, and the attachment viewer mounted on top of that) each used to
 * register their own `document`-level `keydown` listener. Capture-phase
 * listeners on the same node fire in registration order, so the outermost
 * host — mounted first — always intercepted Escape before an inner host got
 * a chance, regardless of `stopPropagation()` calls made by the inner host.
 *
 * This hook replaces those independent listeners with a single shared stack:
 * every mounted modal pushes an entry when it becomes active and pops it on
 * unmount/deactivation. One `document` listener resolves each Escape press
 * to the topmost entry only, so exactly one host closes per keypress and the
 * next-topmost host is naturally revealed once the current one unmounts.
 *
 * @param onClose  - Called when Escape is pressed while this modal is topmost.
 * @param isActive - Whether this modal currently participates in the stack (defaults to true).
 */
import { useEffect, useRef } from "react";

interface StackEntry {
  onCloseRef: { current: () => void };
}

const stack: StackEntry[] = [];
let listenerAttached = false;

function handleGlobalKeyDown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  const top = stack[stack.length - 1];
  top?.onCloseRef.current();
}

// Attached once for the lifetime of the page — a no-op when the stack is empty.
function ensureListenerAttached() {
  if (listenerAttached) return;
  document.addEventListener("keydown", handleGlobalKeyDown, { capture: true });
  listenerAttached = true;
}

export function useModalEscape(onClose: () => void, isActive = true) {
  // Ref keeps the stack entry stable across re-renders while always calling
  // the latest onClose, so callers don't need to memoize it themselves.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isActive) return;
    ensureListenerAttached();
    const entry: StackEntry = { onCloseRef };
    stack.push(entry);
    return () => {
      const idx = stack.indexOf(entry);
      if (idx !== -1) stack.splice(idx, 1);
    };
  }, [isActive]);
}
