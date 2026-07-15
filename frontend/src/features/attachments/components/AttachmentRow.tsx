/**
 * AttachmentRow — a single attachment in the Attachments section list.
 *
 * Shows the title as the primary label, the kind badge, secondary text
 * (external URL for external-ref; MIME type + size for stored-file kinds),
 * author role, and created timestamp. Per-row actions vary by kind:
 *   - external-ref: "Open link" (opens `external_url` in a new tab) + Delete.
 *   - document/image/file: "View" (only when the MIME type is renderable) +
 *     "Download" (always) + Delete.
 *
 * @param attachment - The attachment to render.
 * @param onView     - Called with the attachment when "View" is clicked.
 * @param onDelete   - Called with the attachment when "Delete" is clicked.
 */

import { Download, Eye, ExternalLink, Trash2 } from "lucide-react";
import { IconButton } from "@/shared/components/IconButton";
import { getAttachmentFileUrl } from "@/api/endpoints/attachments";
import { formatFileSize } from "@/features/attachments/utils/formatFileSize";
import { formatTimestamp } from "@/features/attachments/utils/formatTimestamp";
import { isViewableMimeType } from "@/features/attachments/utils/viewerSupport";
import type { Attachment, AttachmentKind } from "@/api/types";

interface AttachmentRowProps {
  attachment: Attachment;
  onView: (attachment: Attachment) => void;
  onDelete: (attachment: Attachment) => void;
}

const KIND_LABELS: Record<AttachmentKind, string> = {
  document: "Document",
  image: "Image",
  file: "File",
  "external-ref": "External link",
};

/** Single attachment row with type/kind badges, metadata, and per-kind actions. */
export function AttachmentRow({ attachment, onView, onDelete }: AttachmentRowProps) {
  const isExternalRef = attachment.kind === "external-ref";
  const isViewable = !isExternalRef && isViewableMimeType(attachment.mime_type);

  function handleOpenExternal() {
    if (attachment.external_url) {
      window.open(attachment.external_url, "_blank", "noopener,noreferrer");
    }
  }

  function handleDownload() {
    window.open(getAttachmentFileUrl(attachment.id), "_blank", "noopener,noreferrer");
  }

  return (
    <li className="flex items-start gap-2 px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Title + badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium text-text">
            {attachment.title}
          </span>
          <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-text-secondary border border-border">
            {KIND_LABELS[attachment.kind]}
          </span>
          {attachment.author_role && (
            <span className="text-[11px] text-text-muted">
              by {attachment.author_role}
            </span>
          )}
        </div>

        {/* URL (external-ref) or MIME type + size (stored-file kinds) */}
        {isExternalRef ? (
          <a
            href={attachment.external_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs text-brand-600 underline hover:text-brand-800"
            title={attachment.external_url ?? undefined}
          >
            {attachment.external_url}
          </a>
        ) : (
          <span className="truncate text-xs text-text-muted">
            {attachment.mime_type}
            {attachment.file_size_bytes != null &&
              ` · ${formatFileSize(attachment.file_size_bytes)}`}
          </span>
        )}

        {/* Timestamp */}
        <span className="text-[11px] text-text-muted">
          {formatTimestamp(attachment.created_at)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {isExternalRef && (
          <IconButton
            Icon={ExternalLink}
            label={`Open ${attachment.title} link`}
            onClick={handleOpenExternal}
          />
        )}
        {!isExternalRef && isViewable && (
          <IconButton
            Icon={Eye}
            label={`View ${attachment.title}`}
            onClick={() => onView(attachment)}
          />
        )}
        {!isExternalRef && (
          <IconButton
            Icon={Download}
            label={`Download ${attachment.title}`}
            onClick={handleDownload}
          />
        )}
        <IconButton
          Icon={Trash2}
          label={`Delete ${attachment.title}`}
          intent="destructive"
          onClick={() => onDelete(attachment)}
        />
      </div>
    </li>
  );
}
