/**
 * SessionModal — modal dialog for creating a new session.
 *
 * Wraps SessionForm in a native <dialog> element with accessible focus
 * trapping and keyboard dismissal (Escape). Delegates mutation logic to the parent.
 */

import { useEffect, useRef } from "react";
import { SessionForm, type SessionCreatePayload } from "./SessionForm";

interface SessionModalProps {
  projectId: string;
  roleOptions: string[];
  onSubmit: (values: SessionCreatePayload) => void;
  onClose: () => void;
  isSubmitting: boolean;
  errorMessage?: string;
  fieldErrors?: Record<string, string>;
}

/** Accessible modal wrapping SessionForm for the create workflow. */
export function SessionModal({
  projectId,
  roleOptions,
  onSubmit,
  onClose,
  isSubmitting,
  errorMessage,
  fieldErrors,
}: SessionModalProps) {
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
      aria-labelledby="session-modal-title"
      className="m-auto w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-xl backdrop:bg-black/40"
    >
      <h2 id="session-modal-title" className="mb-5 text-lg font-semibold text-text">
        New session
      </h2>

      {errorMessage && (
        <p
          role="alert"
          className="mb-4 rounded bg-status-error/10 px-3 py-2 text-sm text-status-error"
        >
          {errorMessage}
        </p>
      )}

      <SessionForm
        projectId={projectId}
        roleOptions={roleOptions}
        fieldErrors={fieldErrors}
        onSubmit={onSubmit}
        onCancel={onClose}
        isSubmitting={isSubmitting}
      />
    </dialog>
  );
}
