/**
 * AttachmentViewerModal — in-app viewer opened by a row's "view" action.
 *
 * Renders the stored file (fetched from `GET /attachments/:id/file`) by
 * `mime_type`: Markdown formatted (react-markdown), plain text/CSV/JSON as
 * raw text in a scrollable `<pre>`, images in a lightbox, and PDF in an
 * embedded `<iframe>` (browser-native viewer, no bundled PDF library).
 * Only ever opened for mime types where `isViewableMimeType` is true — the
 * caller is responsible for that check; docx/xlsx/pptx/zip never reach here.
 *
 * Focus is trapped inside the dialog while open (`useFocusTrap`): opening
 * moves focus onto the close button, Tab/Shift+Tab cycle within the modal,
 * and closing restores focus to the row's "View" button that triggered it.
 *
 * Escape closes only this viewer — never a host it is layered on top of
 * (the Story slide-over or the Task Detail Modal) — via the shared
 * `useModalEscape` stack, see that hook for why a plain per-modal listener
 * cannot guarantee this on its own.
 *
 * @param attachment - The attachment being viewed (kind must not be external-ref).
 * @param onClose    - Called when the user dismisses the viewer.
 */

import { useRef } from "react";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getAttachmentFileUrl } from "@/api/endpoints/attachments";
import { useAttachmentFileText } from "@/features/attachments/hooks/useAttachments";
import { getViewerRenderMode } from "@/features/attachments/utils/viewerSupport";
import { useFocusTrap } from "@/shared/hooks/useFocusTrap";
import { useModalEscape } from "@/shared/hooks/useModalEscape";
import type { Attachment } from "@/api/types";

interface AttachmentViewerModalProps {
  attachment: Attachment;
  onClose: () => void;
}

/** Full-screen-ish modal that renders a stored attachment's content by MIME type. */
export function AttachmentViewerModal({
  attachment,
  onClose,
}: AttachmentViewerModalProps) {
  const mimeType = attachment.mime_type ?? "";
  const renderMode = getViewerRenderMode(mimeType);
  const isTextMode = renderMode === "markdown" || renderMode === "text";
  const fileUrl = getAttachmentFileUrl(attachment.id);

  const {
    data: textContent,
    isLoading: isLoadingText,
    isError: isTextError,
  } = useAttachmentFileText(attachment.id, isTextMode);

  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);
  useModalEscape(onClose);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/60"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attachment-viewer-title"
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 z-[90] flex max-h-[85vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-surface shadow-2xl focus:outline-none"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id="attachment-viewer-title" className="truncate text-sm font-semibold text-text">
            {attachment.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-secondary hover:bg-surface-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            aria-label="Close viewer"
            title="Close viewer"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {renderMode === "markdown" && (
            <>
              {isLoadingText && (
                <p aria-busy="true" className="text-sm text-text-muted">
                  Loading…
                </p>
              )}
              {isTextError && (
                <p role="alert" className="text-sm text-status-error">
                  Failed to load content. Please try again.
                </p>
              )}
              {!isLoadingText && !isTextError && (
                <div className="text-sm text-text [&_a]:text-brand-600 [&_a]:underline [&_code]:rounded [&_code]:bg-surface-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_li]:ml-4 [&_ol]:my-2 [&_ol]:list-decimal [&_p]:mb-2 [&_p]:last:mb-0 [&_pre]:my-2 [&_pre]:rounded-md [&_pre]:bg-surface-muted [&_pre]:p-3 [&_pre]:text-xs [&_ul]:my-2 [&_ul]:list-disc">
                  <ReactMarkdown>{textContent ?? ""}</ReactMarkdown>
                </div>
              )}
            </>
          )}

          {renderMode === "text" && (
            <>
              {isLoadingText && (
                <p aria-busy="true" className="text-sm text-text-muted">
                  Loading…
                </p>
              )}
              {isTextError && (
                <p role="alert" className="text-sm text-status-error">
                  Failed to load content. Please try again.
                </p>
              )}
              {!isLoadingText && !isTextError && (
                <pre className="whitespace-pre-wrap break-words rounded-md bg-surface-muted p-3 text-xs text-text">
                  {textContent}
                </pre>
              )}
            </>
          )}

          {renderMode === "image" && (
            <div className="flex items-center justify-center">
              <img
                src={fileUrl}
                alt={`${attachment.title} attachment preview`}
                className="max-h-[70vh] max-w-full rounded-md object-contain"
              />
            </div>
          )}

          {renderMode === "pdf" && (
            <iframe
              src={fileUrl}
              title={`${attachment.title} PDF preview`}
              className="h-[70vh] w-full rounded-md border border-border"
            />
          )}
        </div>
      </div>
    </>
  );
}
