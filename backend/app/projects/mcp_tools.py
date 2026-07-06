import logging
import math

from fastmcp.dependencies import Depends
from fastmcp.exceptions import ToolError

from app.container.mcp_dependencies import provide_project_service
from app.core.errors import DomainError
from app.mcp.server import mcp_server_v1
from app.projects.schema import (
    CreateProject,
    PaginationMeta,
    Project,
    UpdateProject,
)
from app.projects.service import ProjectService

logger = logging.getLogger(__name__)


@mcp_server_v1.tool()
async def create_project(
    body: CreateProject,
    service: ProjectService = Depends(provide_project_service),
) -> dict:
    try:
        project = service.create(name=body.name, description=body.description)
        return {"data": Project.model_validate(project).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in create_project: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def list_projects(
    page: int = 1,
    limit: int = 20,
    service: ProjectService = Depends(provide_project_service),
) -> dict:
    try:
        projects, total = service.list_paginated(page=page, limit=limit)
        total_pages = math.ceil(total / limit) if total > 0 else 0
        return {
            "data": [Project.model_validate(p).model_dump() for p in projects],
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
        logger.error("Unexpected error in list_projects: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def get_project(
    id: str,
    service: ProjectService = Depends(provide_project_service),
) -> dict:
    try:
        project = service.get(id)
        return {"data": Project.model_validate(project).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in get_project: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def update_project(
    id: str,
    body: UpdateProject,
    service: ProjectService = Depends(provide_project_service),
) -> dict:
    try:
        project = service.update(
            project_id=id,
            name=body.name,
            description=body.description,
        )
        return {"data": Project.model_validate(project).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in update_project: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def delete_project(
    id: str,
    service: ProjectService = Depends(provide_project_service),
) -> dict:
    try:
        service.delete(id)
        return {"success": True}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in delete_project: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc
