import logging
import math

from fastmcp.dependencies import Depends
from fastmcp.exceptions import ToolError

from app.container.mcp_dependencies import provide_task_service
from app.core.errors import DomainError
from app.mcp.server import mcp_server_v1
from app.tasks.schema import (
    CreateTask,
    PaginationMeta,
    Task,
    TaskDetail,
    UpdateTask,
)
from app.tasks.service import TaskService

logger = logging.getLogger(__name__)


@mcp_server_v1.tool()
async def create_task(
    story_id: str,
    body: CreateTask,
    service: TaskService = Depends(provide_task_service),
) -> dict:
    try:
        task = service.create(story_id=story_id, data=body)
        return {"data": Task.model_validate(task).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in create_task: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def list_tasks(
    story_id: str,
    page: int = 1,
    limit: int = 20,
    status: str | None = None,
    type: str | None = None,
    assignee_role: str | None = None,
    creator_role: str | None = None,
    service: TaskService = Depends(provide_task_service),
) -> dict:
    try:
        tasks, total = service.list_paginated(
            story_id=story_id,
            page=page,
            limit=limit,
            status_filter=status,
            type_filter=type,
            assignee_role_filter=assignee_role,
            creator_role_filter=creator_role,
        )
        total_pages = math.ceil(total / limit) if total > 0 else 0
        return {
            "data": [Task.model_validate(t).model_dump() for t in tasks],
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
        logger.error("Unexpected error in list_tasks: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def get_task(
    id: str,
    service: TaskService = Depends(provide_task_service),
) -> dict:
    try:
        task = service.get_by_id(id)
        return {"data": Task.model_validate(task).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in get_task: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def get_task_detail(
    id: str,
    service: TaskService = Depends(provide_task_service),
) -> dict:
    try:
        task = service.get_detail(id)
        detail = TaskDetail.model_validate(task)
        return {"data": detail.model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in get_task_detail: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def update_task(
    id: str,
    body: UpdateTask,
    service: TaskService = Depends(provide_task_service),
) -> dict:
    try:
        task = service.update(task_id=id, data=body)
        return {"data": Task.model_validate(task).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in update_task: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def delete_task(
    id: str,
    service: TaskService = Depends(provide_task_service),
) -> dict:
    try:
        service.delete(task_id=id)
        return {"success": True}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in delete_task: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc
