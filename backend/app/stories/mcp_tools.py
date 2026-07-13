import logging
import math

from fastmcp.dependencies import Depends
from fastmcp.exceptions import ToolError

from app.container.mcp_dependencies import provide_story_service
from app.core.errors import DomainError
from app.mcp.server import mcp_server_v1
from app.stories.schema import (
    CreateStory,
    PaginationMeta,
    Story,
    StoryAggregate,
    StoryDetail,
    UpdateStory,
)
from app.stories.service import StoryService

logger = logging.getLogger(__name__)


@mcp_server_v1.tool()
async def create_story(
    project_id: str,
    body: CreateStory,
    service: StoryService = Depends(provide_story_service),
) -> dict:
    try:
        story = service.create(project_id=project_id, data=body)
        return {"data": Story.model_validate(story).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in create_story: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def list_stories(
    project_id: str,
    page: int = 1,
    limit: int = 20,
    status: str | None = None,
    label_key: str | None = None,
    label_value: str | None = None,
    milestone_id: str | None = None,
    service: StoryService = Depends(provide_story_service),
) -> dict:
    try:
        stories, total = service.list_paginated(
            project_id=project_id,
            page=page,
            limit=limit,
            status_filter=status,
            label_key_filter=label_key,
            label_value_filter=label_value,
            milestone_id_filter=milestone_id,
        )
        total_pages = math.ceil(total / limit) if total > 0 else 0
        return {
            "data": [Story.model_validate(s).model_dump() for s in stories],
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
        logger.error("Unexpected error in list_stories: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def get_story(
    id: str,
    service: StoryService = Depends(provide_story_service),
) -> dict:
    try:
        story = service.get_by_id(id)
        return {"data": Story.model_validate(story).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in get_story: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def update_story(
    id: str,
    body: UpdateStory,
    service: StoryService = Depends(provide_story_service),
) -> dict:
    try:
        # Fetch first to resolve the project_id required by the service layer.
        existing = service.get_by_id(id)
        story = service.update(
            story_id=id,
            project_id=str(existing.project_id),
            data=body,
        )
        return {"data": Story.model_validate(story).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in update_story: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def delete_story(
    id: str,
    service: StoryService = Depends(provide_story_service),
) -> dict:
    try:
        existing = service.get_by_id(id)
        service.delete(
            story_id=id,
            project_id=str(existing.project_id),
        )
        return {"success": True}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in delete_story: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def get_story_detail(
    id: str,
    service: StoryService = Depends(provide_story_service),
) -> dict:
    try:
        story, links = service.get_detail(id)
        detail = StoryDetail.model_validate(story)
        detail.links = [lnk.model_dump() for lnk in links]
        return {"data": detail.model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in get_story_detail: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def get_story_aggregate(
    id: str,
    service: StoryService = Depends(provide_story_service),
) -> dict:
    try:
        aggregate = service.get_aggregate(id)
        return {"data": StoryAggregate.model_validate(aggregate).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error(
            "Unexpected error in get_story_aggregate: %s", exc, exc_info=exc
        )
        raise ToolError("Internal server error.") from exc
