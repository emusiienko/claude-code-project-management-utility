/**
 * ArchiveSessionDialog — confirmation dialog before archiving a session.
 *
 * Archiving is not destructive — an archived session keeps its full record
 * and remains fully editable, and is simply excluded from default listings.
 * Structurally mirrors DeleteMilestoneDialog, with a neutral (not
 * destructive-red) confirm action to reflect that this is reversible in
 * effect (re-listable via "include archived"), even though there is no
 * un-archive endpoint.
 */

import { useEffect, useRef } from "react";
import type { Session } from "@/api/types";

interface ArchiveSessionDialogProps {
  session: Session;
  onConfirm: () => void;
  onClose: () => void;
  isArchiving: boolean;
  errorMessage?: string;
}

export function ArchiveSessionDialog({
  session,
  onConfirm,
  onClose,
  isArchiving,
  errorMessage,
}: ArchiveSessionDialogProps) {
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
      aria-labelledby="archive-session-title"
      aria-describedby="archive-session-description"
      className="m-auto w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl backdrop:bg-black/40"
    >
      <h2 id="archive-session-title" className="mb-3 text-lg font-semibold text-text">
        Archive session?
      </h2>

      <p id="archive-session-description" className="mb-5 text-sm text-text-secondary">
        You are about to archive <strong className="text-text">{session.topic}</strong>. It will
        no longer appear in the default session list, but its full record stays intact and
        editable.
      </p>

      {errorMessage && (
        <p role="alert" className="mb-4 rounded bg-status-error/10 px-3 py-2 text-sm text-status-error">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isArchiving}
          className="rounded-md border border-border px-4 py-2 text-sm text-text hover:bg-surface-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isArchiving}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isArchiving ? "Archiving…" : "Archive session"}
        </button>
      </div>
    </dialog>
  );
}
