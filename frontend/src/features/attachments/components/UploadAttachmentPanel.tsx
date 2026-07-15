/**
 * UploadAttachmentPanel — the "Add attachment" form covering all four kinds.
 *
 * - document: toggle between writing Markdown inline (textarea) and uploading
 *   a `.md`/`.txt` file (MIME auto-detected from the extension).
 * - image: file picker restricted to PNG/JPEG/GIF/WEBP.
 * - file: file picker restricted to the curated binary allow-list
 *   (PDF/DOCX/XLSX/PPTX/CSV/TXT/JSON/ZIP).
 * - external-ref: required URL + optional status.
 *
 * Every kind requires a Title: file-based kinds (document-as-file, image,
 * file) pre-fill it from the chosen file's name (truncated to the max
 * length) but stay editable before submit; document "Write Markdown" and
 * external-ref start with an empty Title the user must type.
 *
 * Both binary pickers (image, file) and the document file-upload mode apply a
 * client-side 10 MB guard before submission. An upload progress indicator is
 * shown for files larger than 1 MB while the mutation is in flight.
 *
 * @param onSubmit     - Called with the discriminated create input on submit.
 * @param onCancel     - Called when the user cancels.
 * @param isSubmitting - True while the parent mutation is in flight.
 * @param errorMessage - Top-level error message from a failed create attempt.
 * @param fieldErrors  - Per-field API error messages, keyed by field name.
 */

import { useEffect, useState } from "react";
import type { CreateAttachmentInput } from "@/features/attachments/hooks/useAttachments";
import type { AttachmentKind } from "@/api/types";
import {
  DOCUMENT_FILE_ACCEPT,
  FILE_KIND_ACCEPT,
  IMAGE_KIND_ACCEPT,
  MAX_UPLOAD_SIZE_BYTES,
  UPLOAD_PROGRESS_THRESHOLD_BYTES,
  detectDocumentMimeType,
  resolveBinaryMimeType,
} from "@/features/attachments/utils/mimeAllowList";
import { TITLE_MAX_LENGTH, truncateTitle } from "@/features/attachments/utils/attachmentTitle";

type DocumentMode = "text" | "file";

interface UploadAttachmentPanelProps {
  onSubmit: (input: CreateAttachmentInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  errorMessage?: string;
  fieldErrors?: Record<string, string>;
}

const SIZE_LIMIT_MESSAGE = "File must be smaller than 10 MB.";
const TITLE_REQUIRED_MESSAGE = "A title is required for every attachment.";

const inputClass =
  "w-full rounded border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50";
const errorClass = "mt-0.5 text-xs text-status-error";

/** Create form for the four attachment kinds. Owns all field state internally. */
export function UploadAttachmentPanel({
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
  fieldErrors = {},
}: UploadAttachmentPanelProps) {
  const [kind, setKind] = useState<AttachmentKind>("document");
  const [title, setTitle] = useState("");
  const [authorRole, setAuthorRole] = useState("");

  const [documentMode, setDocumentMode] = useState<DocumentMode>("text");
  const [documentText, setDocumentText] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileKindFile, setFileKindFile] = useState<File | null>(null);

  const [externalUrl, setExternalUrl] = useState("");
  const [externalStatus, setExternalStatus] = useState("");

  const [sizeError, setSizeError] = useState<string | undefined>();

  const isFileBasedKind =
    (kind === "document" && documentMode === "file") ||
    kind === "image" ||
    kind === "file";

  const selectedFile =
    kind === "document" && documentMode === "file"
      ? documentFile
      : kind === "image"
        ? imageFile
        : kind === "file"
          ? fileKindFile
          : null;

  const showUploadProgress =
    isSubmitting &&
    selectedFile !== null &&
    selectedFile.size > UPLOAD_PROGRESS_THRESHOLD_BYTES;

  // Pre-fills the title from the selected file's name for file-based kinds;
  // document "Write Markdown" and external-ref get no default and start
  // empty (no file name to derive one from). The title stays editable — a
  // later file selection re-fills it, but does not stomp on the user typing
  // in a non-file-based mode.
  useEffect(() => {
    if (isFileBasedKind && selectedFile) {
      setTitle(truncateTitle(selectedFile.name));
    } else if (!isFileBasedKind) {
      setTitle("");
    }
  }, [isFileBasedKind, selectedFile]);

  /** Applies the 10 MB client-side guard; returns the file if it passes, else null. */
  function guardFileSize(file: File): File | null {
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setSizeError(SIZE_LIMIT_MESSAGE);
      return null;
    }
    setSizeError(undefined);
    return file;
  }

  function handleKindChange(nextKind: AttachmentKind) {
    setKind(nextKind);
    setSizeError(undefined);
  }

  const titleValid = title.trim().length > 0;
  const canSubmit =
    !isSubmitting &&
    titleValid &&
    !sizeError &&
    (kind === "document"
      ? documentMode === "text"
        ? documentText.trim().length > 0
        : documentFile !== null
      : kind === "image"
        ? imageFile !== null
        : kind === "file"
          ? fileKindFile !== null
          : externalUrl.trim().length > 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const trimmedTitle = title.trim();
    const author_role = authorRole.trim() || undefined;

    if (kind === "external-ref") {
      onSubmit({
        method: "external-ref",
        data: {
          title: trimmedTitle,
          kind: "external-ref",
          external_url: externalUrl.trim(),
          external_status: externalStatus.trim() || undefined,
          author_role,
        },
      });
      return;
    }

    if (kind === "document" && documentMode === "text") {
      onSubmit({
        method: "document-text",
        data: {
          title: trimmedTitle,
          kind: "document",
          content: documentText.trim(),
          mime_type: "text/markdown",
          author_role,
        },
      });
      return;
    }

    if (kind === "document" && documentFile) {
      onSubmit({
        method: "stored-file",
        data: {
          title: trimmedTitle,
          kind: "document",
          mime_type: detectDocumentMimeType(documentFile.name),
          author_role,
          file: documentFile,
        },
      });
      return;
    }

    if (kind === "image" && imageFile) {
      onSubmit({
        method: "stored-file",
        data: {
          title: trimmedTitle,
          kind: "image",
          mime_type: resolveBinaryMimeType(imageFile),
          author_role,
          file: imageFile,
        },
      });
      return;
    }

    if (kind === "file" && fileKindFile) {
      onSubmit({
        method: "stored-file",
        data: {
          title: trimmedTitle,
          kind: "file",
          mime_type: resolveBinaryMimeType(fileKindFile),
          author_role,
          file: fileKindFile,
        },
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Add attachment"
      className="flex flex-col gap-3 rounded-md border border-border bg-surface-muted p-3"
    >
      {/* Kind selector */}
      <div>
        <span className="mb-1 block text-xs font-medium text-text-secondary">Kind</span>
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Attachment kind">
          {(["document", "image", "file", "external-ref"] as const).map((k) => (
            <label key={k} className="flex items-center gap-1.5 text-xs text-text">
              <input
                type="radio"
                name="attachment-kind"
                value={k}
                checked={kind === k}
                onChange={() => handleKindChange(k)}
                disabled={isSubmitting}
              />
              {k === "external-ref" ? "External link" : k[0].toUpperCase() + k.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="attachment-title" className="mb-1 block text-xs font-medium text-text-secondary">
          Title <span aria-hidden="true" className="text-status-error">*</span>
        </label>
        <input
          id="attachment-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isSubmitting}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="e.g. Architecture diagram v2"
          aria-describedby={
            !titleValid || fieldErrors.title ? "attachment-title-error" : undefined
          }
          className={inputClass}
        />
        {(fieldErrors.title || !titleValid) && (
          <p id="attachment-title-error" role="alert" className={errorClass}>
            {fieldErrors.title ?? TITLE_REQUIRED_MESSAGE}
          </p>
        )}
      </div>

      {/* Document fields */}
      {kind === "document" && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-3" role="radiogroup" aria-label="Document mode">
            <label className="flex items-center gap-1.5 text-xs text-text">
              <input
                type="radio"
                name="document-mode"
                value="text"
                checked={documentMode === "text"}
                onChange={() => setDocumentMode("text")}
                disabled={isSubmitting}
              />
              Write Markdown
            </label>
            <label className="flex items-center gap-1.5 text-xs text-text">
              <input
                type="radio"
                name="document-mode"
                value="file"
                checked={documentMode === "file"}
                onChange={() => setDocumentMode("file")}
                disabled={isSubmitting}
              />
              Upload .md / .txt file
            </label>
          </div>

          {documentMode === "text" ? (
            <div>
              <label htmlFor="attachment-document-text" className="mb-1 block text-xs font-medium text-text-secondary">
                Content (Markdown)
              </label>
              <textarea
                id="attachment-document-text"
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                disabled={isSubmitting}
                rows={5}
                placeholder="Write Markdown content…"
                className={`${inputClass} resize-y`}
              />
            </div>
          ) : (
            <div>
              <label htmlFor="attachment-document-file" className="mb-1 block text-xs font-medium text-text-secondary">
                File
              </label>
              <input
                id="attachment-document-file"
                type="file"
                accept={DOCUMENT_FILE_ACCEPT}
                disabled={isSubmitting}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setDocumentFile(file ? guardFileSize(file) : null);
                }}
                className="block w-full text-xs text-text"
              />
              {sizeError && (
                <p role="alert" className={errorClass}>
                  {sizeError}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Image field */}
      {kind === "image" && (
        <div>
          <label htmlFor="attachment-image-file" className="mb-1 block text-xs font-medium text-text-secondary">
            Image (PNG/JPEG/GIF/WEBP)
          </label>
          <input
            id="attachment-image-file"
            type="file"
            accept={IMAGE_KIND_ACCEPT}
            disabled={isSubmitting}
            onChange={(e) => {
              const file = e.target.files?.[0];
              setImageFile(file ? guardFileSize(file) : null);
            }}
            className="block w-full text-xs text-text"
          />
          {sizeError && (
            <p role="alert" className={errorClass}>
              {sizeError}
            </p>
          )}
        </div>
      )}

      {/* File field */}
      {kind === "file" && (
        <div>
          <label htmlFor="attachment-file-file" className="mb-1 block text-xs font-medium text-text-secondary">
            File (PDF/DOCX/XLSX/PPTX/CSV/TXT/JSON/ZIP)
          </label>
          <input
            id="attachment-file-file"
            type="file"
            accept={FILE_KIND_ACCEPT}
            disabled={isSubmitting}
            onChange={(e) => {
              const file = e.target.files?.[0];
              setFileKindFile(file ? guardFileSize(file) : null);
            }}
            className="block w-full text-xs text-text"
          />
          {sizeError && (
            <p role="alert" className={errorClass}>
              {sizeError}
            </p>
          )}
        </div>
      )}

      {/* External-ref fields */}
      {kind === "external-ref" && (
        <>
          <div>
            <label htmlFor="attachment-external-url" className="mb-1 block text-xs font-medium text-text-secondary">
              URL <span aria-hidden="true" className="text-status-error">*</span>
            </label>
            <input
              id="attachment-external-url"
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              required
              disabled={isSubmitting}
              placeholder="https://…"
              aria-describedby={fieldErrors.external_url ? "attachment-external-url-error" : undefined}
              className={inputClass}
            />
            {fieldErrors.external_url && (
              <p id="attachment-external-url-error" role="alert" className={errorClass}>
                {fieldErrors.external_url}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="attachment-external-status" className="mb-1 block text-xs font-medium text-text-secondary">
              Status (optional)
            </label>
            <input
              id="attachment-external-status"
              type="text"
              value={externalStatus}
              onChange={(e) => setExternalStatus(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. current, superseded"
              className={inputClass}
            />
          </div>
        </>
      )}

      {/* Author role (all kinds) */}
      <div>
        <label htmlFor="attachment-author-role" className="mb-1 block text-xs font-medium text-text-secondary">
          Author role (optional)
        </label>
        <input
          id="attachment-author-role"
          type="text"
          value={authorRole}
          onChange={(e) => setAuthorRole(e.target.value)}
          disabled={isSubmitting}
          placeholder="e.g. backend-developer"
          className={inputClass}
        />
      </div>

      {/* Upload progress indicator (files > 1 MB) */}
      {showUploadProgress && (
        <div aria-busy="true" className="flex items-center gap-2 text-xs text-text-secondary">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          Uploading…
        </div>
      )}

      {/* Top-level error */}
      {errorMessage && (
        <p role="alert" className="rounded bg-status-error/10 px-3 py-2 text-xs text-status-error">
          {errorMessage}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text hover:bg-surface disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Adding…" : "Add attachment"}
        </button>
      </div>
    </form>
  );
}
