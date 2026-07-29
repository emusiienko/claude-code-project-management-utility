import logging
import math

from fastmcp.dependencies import Depends
from fastmcp.exceptions import ToolError

from app.container.mcp_dependencies import provide_session_service
from app.core.errors import DomainError
from app.mcp.server import mcp_server_v1
from app.sessions.schema import CreateSession, PaginationMeta, Session, UpdateSession
from app.sessions.service import SessionService

logger = logging.getLogger(__name__)


@mcp_server_v1.tool()
async def create_session(
    body: CreateSession,
    service: SessionService = Depends(provide_session_service),
) -> dict:
    try:
        session = service.create(data=body)
        return {"data": Session.model_validate(session).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in create_session: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def list_sessions(
    project_id: str,
    page: int = 1,
    limit: int = 20,
    incomplete: bool = False,
    linked_story_id: str | None = None,
    include_archived: bool = False,
    service: SessionService = Depends(provide_session_service),
) -> dict:
    try:
        rows, total = service.list_paginated(
            project_id=project_id,
            page=page,
            limit=limit,
            incomplete_only=incomplete,
            linked_story_id=linked_story_id,
            include_archived=include_archived,
        )
        total_pages = math.ceil(total / limit) if total > 0 else 0

        return {
            "data": [Session.model_validate(s).model_dump() for s in rows],
            "meta": PaginationMeta(
                total=total,
                page=page,
                limit=limit,
                totalPages=total_pages,
            ).model_dump(),
        }
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in list_sessions: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def get_session(
    id: str,
    service: SessionService = Depends(provide_session_service),
) -> dict:
    try:
        session = service.get_by_id(id)
        return {"data": Session.model_validate(session).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in get_session: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def update_session(
    id: str,
    body: UpdateSession,
    service: SessionService = Depends(provide_session_service),
) -> dict:
    try:
        session = service.update(session_id=id, data=body)
        return {"data": Session.model_validate(session).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in update_session: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def archive_session(
    id: str,
    service: SessionService = Depends(provide_session_service),
) -> dict:
    try:
        session = service.archive(id)
        return {"data": Session.model_validate(session).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in archive_session: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc
