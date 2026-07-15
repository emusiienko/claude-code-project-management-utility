/**
 * Attachment endpoint functions.
 *
 * Plain async wrappers around apiClient — one function per API operation.
 * TanStack Query hooks in src/features/attachments/hooks/ consume these functions.
 *
 * Endpoints covered (v1.6 — create + list + get + delete; no update, no archive):
 *   POST   /v1/stories/:storyId/attachments
 *   POST   /v1/tasks/:taskId/attachments
 *   POST   /v1/milestones/:id/attachments
 *   GET    /v1/{container}/:id/attachments?page&limit&kind
 *   GET    /v1/attachments/:id
 *   GET    /v1/attachments/:id/file (raw file — see getAttachmentFileUrl/getAttachmentFileText)
 *   DELETE /v1/attachments/:id
 *
 * The base64 MCP create/read tools are agent-only and have no REST equivalent —
 * they are intentionally absent from this module.
 */

import { apiClient, buildApiUrl } from "@/core/client";
import { API_PATHS } from "@/api/paths";
import type {
  Attachment,
  AttachmentKind,
  ContainerType,
  CreateDocumentAttachment,
  CreateExternalRefAttachment,
  CreateStoredFileAttachment,
  Envelope,
  ListEnvelope,
} from "@/api/types";

/** Filters supported by the attachment list endpoint. */
export interface AttachmentFilters {
  kind?: AttachmentKind;
}

/** Resolves the container-scoped attachments collection path for the given container type. */
function containerAttachmentsPath(
  containerType: ContainerType,
  containerId: string,
): string {
  switch (containerType) {
    case "story":
      return API_PATHS.STORY_ATTACHMENTS(containerId);
    case "task":
      return API_PATHS.TASK_ATTACHMENTS(containerId);
    case "milestone":
      return API_PATHS.MILESTONE_ATTACHMENTS(containerId);
  }
}

/**
 * GET /v1/{container}/:id/attachments — paginated, optionally filtered attachment list.
 *
 * @param containerType - story | task | milestone.
 * @param containerId   - The owning container's ID.
 * @param filters       - Optional `kind` filter.
 * @param page          - 1-based page number (defaults to 1).
 * @param limit         - Items per page.
 */
export async function listAttachments(
  containerType: ContainerType,
  containerId: string,
  filters?: AttachmentFilters,
  page = 1,
  limit = 100,
): Promise<ListEnvelope<Attachment>> {
  return apiClient.get<ListEnvelope<Attachment>>(
    containerAttachmentsPath(containerType, containerId),
    { page, limit, ...filters },
  );
}

/**
 * POST /v1/{container}/:id/attachments (JSON, kind = document) — creates a
 * document attachment from inline UTF-8 text content.
 */
export async function createDocumentAttachment(
  containerType: ContainerType,
  containerId: string,
  data: CreateDocumentAttachment,
): Promise<Attachment> {
  const envelope = await apiClient.post<Envelope<Attachment>>(
    containerAttachmentsPath(containerType, containerId),
    data,
  );
  return envelope.data;
}

/**
 * POST /v1/{container}/:id/attachments (JSON, kind = external-ref) — creates
 * an external-reference attachment (URL + optional status, no stored file).
 */
export async function createExternalRefAttachment(
  containerType: ContainerType,
  containerId: string,
  data: CreateExternalRefAttachment,
): Promise<Attachment> {
  const envelope = await apiClient.post<Envelope<Attachment>>(
    containerAttachmentsPath(containerType, containerId),
    data,
  );
  return envelope.data;
}

/**
 * POST /v1/{container}/:id/attachments (multipart/form-data) — uploads a
 * document-as-file, image, or file (opaque binary) attachment.
 */
export async function createStoredFileAttachment(
  containerType: ContainerType,
  containerId: string,
  data: CreateStoredFileAttachment,
): Promise<Attachment> {
  const formData = new FormData();
  formData.set("title", data.title);
  formData.set("kind", data.kind);
  formData.set("mime_type", data.mime_type);
  if (data.author_role) formData.set("author_role", data.author_role);
  formData.set("file", data.file);

  const envelope = await apiClient.upload<Envelope<Attachment>>(
    containerAttachmentsPath(containerType, containerId),
    formData,
  );
  return envelope.data;
}

/** GET /v1/attachments/:id — fetches a single attachment's metadata. */
export async function getAttachment(id: string): Promise<Attachment> {
  const envelope = await apiClient.get<Envelope<Attachment>>(
    API_PATHS.ATTACHMENT(id),
  );
  return envelope.data;
}

/**
 * DELETE /v1/attachments/:id — permanently deletes an attachment of any kind.
 * Removes the stored file too, for document/image/file kinds.
 */
export async function deleteAttachment(id: string): Promise<void> {
  await apiClient.delete(API_PATHS.ATTACHMENT(id));
}

/**
 * Absolute URL for `GET /v1/attachments/:id/file` — used directly as an
 * `<img src>` / `<iframe src>` / download anchor `href`, bypassing the JSON
 * apiClient wrapper since the response is the raw file, not an envelope.
 * Not applicable to external-ref attachments (no stored file).
 */
export function getAttachmentFileUrl(id: string): string {
  return buildApiUrl(API_PATHS.ATTACHMENT_FILE(id));
}

/**
 * Fetches the stored file's raw text content — used by the in-app viewer to
 * render markdown, plain text, CSV, and JSON attachments.
 */
export async function getAttachmentFileText(id: string): Promise<string> {
  return apiClient.getText(API_PATHS.ATTACHMENT_FILE(id));
}
