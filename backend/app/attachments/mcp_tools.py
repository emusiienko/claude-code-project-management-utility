import base64
import logging
import math

from fastmcp.dependencies import Depends
from fastmcp.exceptions import ToolError

from app.attachments.schema import (
    KIND_DOCUMENT,
    KIND_EXTERNAL_REF,
    Attachment,
    AttachmentCreateInput,
    CreateBase64FileAttachment,
    CreateDocumentAttachmentText,
    CreateExternalRefAttachment,
    PaginationMeta,
)
from app.attachments.service import AttachmentService
from app.container.mcp_dependencies import provide_attachment_service
from app.core.errors import DomainError
from app.mcp.server import mcp_server_v1

logger = logging.getLogger(__name__)


@mcp_server_v1.tool()
async def create_document_attachment(
    container_type: str,
    container_id: str,
    body: CreateDocumentAttachmentText,
    service: AttachmentService = Depends(provide_attachment_service),
) -> dict:
    try:
        data = AttachmentCreateInput(
            title=body.title,
            kind=KIND_DOCUMENT,
            text_content=body.content,
            mime_type=body.mime_type,
            author_role=body.author_role,
        )
        attachment = service.create(
            container_type=container_type, container_id=container_id, data=data
        )
        return {"data": Attachment.model_validate(attachment).model_dump(mode="json")}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error(
            "Unexpected error in create_document_attachment: %s", exc, exc_info=exc
        )
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def create_external_ref_attachment(
    container_type: str,
    container_id: str,
    body: CreateExternalRefAttachment,
    service: AttachmentService = Depends(provide_attachment_service),
) -> dict:
    try:
        data = AttachmentCreateInput(
            title=body.title,
            kind=KIND_EXTERNAL_REF,
            external_url=body.external_url,
            external_status=body.external_status,
            author_role=body.author_role,
        )
        attachment = service.create(
            container_type=container_type, container_id=container_id, data=data
        )
        return {"data": Attachment.model_validate(attachment).model_dump(mode="json")}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error(
            "Unexpected error in create_external_ref_attachment: %s", exc, exc_info=exc
        )
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def create_file_attachment(
    container_type: str,
    container_id: str,
    body: CreateBase64FileAttachment,
    service: AttachmentService = Depends(provide_attachment_service),
) -> dict:
    # Decodes onto the same service path REST multipart uses — full upload
    # parity for agents. Covers image, file, and document-uploaded-as-a-file.
    try:
        try:
            file_bytes = base64.b64decode(body.content_base64, validate=True)
        except (ValueError, TypeError) as exc:
            raise ToolError("content_base64 is not valid base64.") from exc

        data = AttachmentCreateInput(
            title=body.title,
            kind=body.kind,
            file_bytes=file_bytes,
            mime_type=body.mime_type,
            author_role=body.author_role,
        )
        attachment = service.create(
            container_type=container_type, container_id=container_id, data=data
        )
        return {"data": Attachment.model_validate(attachment).model_dump(mode="json")}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except ToolError:
        raise
    except Exception as exc:
        logger.error(
            "Unexpected error in create_file_attachment: %s", exc, exc_info=exc
        )
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def list_attachments(
    container_type: str,
    container_id: str,
    page: int = 1,
    limit: int = 20,
    kind: str | None = None,
    service: AttachmentService = Depends(provide_attachment_service),
) -> dict:
    try:
        attachments, total = service.list_paginated(
            container_type=container_type,
            container_id=container_id,
            page=page,
            limit=limit,
            kind_filter=kind,
        )
        total_pages = math.ceil(total / limit) if total > 0 else 0
        return {
            "data": [
                Attachment.model_validate(a).model_dump(mode="json")
                for a in attachments
            ],
            "meta": PaginationMeta(
                total=total, page=page, limit=limit, totalPages=total_pages
            ).model_dump(),
        }
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in list_attachments: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def get_attachment(
    id: str,
    service: AttachmentService = Depends(provide_attachment_service),
) -> dict:
    try:
        attachment = service.get_by_id(id)
        return {"data": Attachment.model_validate(attachment).model_dump(mode="json")}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in get_attachment: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def get_attachment_file(
    id: str,
    service: AttachmentService = Depends(provide_attachment_service),
) -> dict:
    # Returns the stored file's bytes as base64 (document/image/file); errors
    # for external-ref, which has no stored file. Agent-only — the Web UI
    # downloads via GET /attachments/:id/file instead.
    try:
        content_base64, mime_type = service.get_file_base64(id)
        return {"mime_type": mime_type, "content_base64": content_base64}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in get_attachment_file: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def delete_attachment(
    id: str,
    service: AttachmentService = Depends(provide_attachment_service),
) -> dict:
    try:
        service.delete(id)
        return {"success": True}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in delete_attachment: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc
