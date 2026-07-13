/**
 * DeleteStoryLinkDialog — confirmation dialog before permanently removing a story link.
 *
 * @param isOpen      - Whether the dialog is visible.
 * @param linkType    - The link_type value shown in the confirmation message.
 * @param linkedTitle - Title of the linked story shown in the confirmation message.
 * @param isDeleting  - True while the delete mutation is in flight.
 * @param onConfirm   - Called when the user confirms deletion.
 * @param onCancel    - Called when the user cancels or closes the dialog.
 */

interface DeleteStoryLinkDialogProps {
  isOpen: boolean;
  linkType: string;
  linkedTitle: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal confirmation dialog for deleting a story link.
 * Renders as a fixed overlay above the slide-over panel.
 */
export function DeleteStoryLinkDialog({
  isOpen,
  linkType,
  linkedTitle,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteStoryLinkDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/40"
        aria-hidden="true"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-story-link-title"
        aria-describedby="delete-story-link-desc"
        className="fixed left-1/2 top-1/2 z-[90] w-80 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface p-5 shadow-2xl"
      >
        <h2
          id="delete-story-link-title"
          className="mb-2 text-sm font-semibold text-text"
        >
          Remove link?
        </h2>
        <p
          id="delete-story-link-desc"
          className="mb-5 text-xs text-text-secondary"
        >
          Remove the <span className="font-medium">{linkType}</span> link to{" "}
          <span className="font-medium">{linkedTitle}</span>? This cannot be
          undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-text hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-md bg-status-error px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-status-error/40 disabled:opacity-50"
          >
            {isDeleting ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </>
  );
}
