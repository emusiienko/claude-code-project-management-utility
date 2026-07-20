/**
 * Toast — a single transient confirmation/notification banner, fixed at the
 * bottom of the viewport. Purely presentational; auto-dismiss timing is
 * owned by the paired `useToast` hook.
 *
 * @param message   - Text to display.
 * @param onDismiss - Called when the user dismisses the toast manually.
 */

import { X } from "lucide-react";

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

/** Bottom-centered toast banner, announced politely to assistive tech. */
export function Toast({ message, onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4"
    >
      <div className="flex items-center gap-3 rounded-md bg-text px-4 py-2 text-sm text-white shadow-lg">
        <span>{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          title="Dismiss notification"
          className="rounded text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
