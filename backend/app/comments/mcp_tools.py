import logging
import math

from fastmcp.dependencies import Depends
from fastmcp.exceptions import ToolError

from app.comments.schema import Comment, CreateComment, PaginationMeta, UpdateComment
from app.comments.service import CommentService
from app.container.mcp_dependencies import provide_comment_service
from app.core.errors import DomainError
from app.mcp.server import mcp_server_v1

logger = logging.getLogger(__name__)

_LIST_DEFAULT_LIMIT = 50


@mcp_server_v1.tool()
async def create_comment(
    container_type: str,
    container_id: str,
    body: CreateComment,
    service: CommentService = Depends(provide_comment_service),
) -> dict:
    try:
        comment = service.create(
            container_type=container_type, container_id=container_id, data=body
        )
        return {"data": Comment.model_validate(comment).model_dump(mode="json")}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in create_comment: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def list_comments(
    container_type: str,
    container_id: str,
    page: int = 1,
    limit: int = _LIST_DEFAULT_LIMIT,
    label_key: str | None = None,
    label_value: str | None = None,
    after_id: str | None = None,
    descendant_of: str | None = None,
    service: CommentService = Depends(provide_comment_service),
) -> dict:
    try:
        comments, total = service.list_paginated(
            container_type=container_type,
            container_id=container_id,
            page=page,
            limit=limit,
            label_key_filter=label_key,
            label_value_filter=label_value,
            descendant_of_filter=descendant_of,
            after_id_filter=after_id,
        )
        total_pages = math.ceil(total / limit) if total > 0 else 0
        return {
            "data": [
                Comment.model_validate(c).model_dump(mode="json") for c in comments
            ],
            "meta": PaginationMeta(
                total=total, page=page, limit=limit, totalPages=total_pages
            ).model_dump(),
        }
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in list_comments: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def get_comment(
    id: str,
    service: CommentService = Depends(provide_comment_service),
) -> dict:
    try:
        comment = service.get_by_id(id)
        return {"data": Comment.model_validate(comment).model_dump(mode="json")}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in get_comment: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def get_comment_ancestors(
    id: str,
    service: CommentService = Depends(provide_comment_service),
) -> list[dict]:
    try:
        ancestors = service.get_ancestors(id)
        return [Comment.model_validate(a).model_dump(mode="json") for a in ancestors]
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in get_comment_ancestors: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def update_comment(
    id: str,
    body: UpdateComment,
    service: CommentService = Depends(provide_comment_service),
) -> dict:
    try:
        comment = service.update(comment_id=id, data=body)
        return {"data": Comment.model_validate(comment).model_dump(mode="json")}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in update_comment: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def delete_comment(
    id: str,
    service: CommentService = Depends(provide_comment_service),
) -> dict:
    try:
        service.delete(id)
        return {"success": True}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in delete_comment: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc
