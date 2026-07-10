/**
 * ActivateMilestoneDialog — confirmation dialog shown when activating a milestone
 * while another milestone in the same project is already Active.
 *
 * The backend will atomically demote the currently-active milestone back to Planned
 * and promote the target. This dialog names the currently-active milestone so the
 * user understands what will change before confirming.
 */

import { useEffect, useRef } from "react";
import type { Milestone } from "@/api/types";

interface ActivateMilestoneDialogProps {
  /** The milestone the user wants to activate. */
  target: Milestone;
  /** The milestone that is currently active (will be demoted to Planned). */
  currentlyActive: Milestone;
  /** Called when the user confirms. */
  onConfirm: () => void;
  /** Called when the user cancels or dismisses the dialog. */
  onClose: () => void;
  /** Whether the activate mutation is in-flight. */
  isActivating: boolean;
  /** API error message to display if the mutation fails. */
  errorMessage?: string;
}

/**
 * Modal confirmation shown when activating over an already-active milestone.
 * Names both the target and the one that will be demoted so the user understands
 * the atomic swap.
 */
export function ActivateMilestoneDialog({
  target,
  currentlyActive,
  onConfirm,
  onClose,
  isActivating,
  errorMessage,
}: ActivateMilestoneDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function handleDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleDialogClick}
      aria-labelledby="activate-milestone-title"
      aria-describedby="activate-milestone-description"
      className="m-auto w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl backdrop:bg-black/40"
    >
      <h2
        id="activate-milestone-title"
        className="mb-3 text-lg font-semibold text-text"
      >
        Activate milestone?
      </h2>

      <p id="activate-milestone-description" className="mb-2 text-sm text-text-secondary">
        You are about to activate{" "}
        <strong className="text-text">{target.name}</strong>.
      </p>

      <p className="mb-5 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
        <strong className="text-amber-900">{currentlyActive.name}</strong> is currently Active
        and will be set back to Planned.
      </p>

      {errorMessage && (
        <p
          role="alert"
          className="mb-4 rounded bg-status-error/10 px-3 py-2 text-sm text-status-error"
        >
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isActivating}
          className="rounded-md border border-border px-4 py-2 text-sm text-text hover:bg-surface-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isActivating}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isActivating ? "Activating…" : "Activate milestone"}
        </button>
      </div>
    </dialog>
  );
}
