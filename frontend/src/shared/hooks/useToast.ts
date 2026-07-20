/**
 * useToast — manages a single transient toast message with auto-dismiss.
 *
 * No global toast store exists in the app yet; this hook is intentionally
 * local (owned by whichever screen/section calls it) rather than a
 * context-based singleton, consistent with the "no global client state
 * store" convention. First consumer: the Comments feature's Copy Link
 * action (STORY-008).
 */

import { useCallback, useEffect, useState } from "react";

const TOAST_DURATION_MS = 3000;

export interface UseToastResult {
  /** Current message, or undefined when no toast is showing. */
  message: string | undefined;
  /** Shows a new toast, replacing any currently visible one. */
  show: (text: string) => void;
  /** Dismisses the current toast immediately. */
  dismiss: () => void;
}

/** Auto-dismisses the shown message after a fixed delay. */
export function useToast(): UseToastResult {
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(undefined), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [message]);

  const show = useCallback((text: string) => setMessage(text), []);
  const dismiss = useCallback(() => setMessage(undefined), []);

  return { message, show, dismiss };
}
