import logging
import math

from fastmcp.dependencies import Depends
from fastmcp.exceptions import ToolError

from app.container.mcp_dependencies import provide_milestone_service
from app.core.errors import DomainError
from app.mcp.server import mcp_server_v1
from app.milestones.schema import (
    CreateMilestone,
    Milestone,
    MilestoneDetail,
    PaginationMeta,
    UpdateMilestone,
)
from app.milestones.service import MilestoneService
from app.stories.schema import PaginationMeta as StoryPaginationMeta
from app.stories.schema import Story

logger = logging.getLogger(__name__)


@mcp_server_v1.tool()
async def create_milestone(
    body: CreateMilestone,
    service: MilestoneService = Depends(provide_milestone_service),
) -> dict:
    try:
        milestone = service.create(data=body)
        return {"data": Milestone.model_validate(milestone).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in create_milestone: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def list_milestones(
    page: int = 1,
    limit: int = 20,
    project_id: str | None = None,
    service: MilestoneService = Depends(provide_milestone_service),
) -> dict:
    try:
        rows, total = service.list_paginated(
            page=page, limit=limit, project_id=project_id
        )
        total_pages = math.ceil(total / limit) if total > 0 else 0

        data = []
        for milestone, story_count in rows:
            m_dict = Milestone.model_validate(milestone).model_dump()
            m_dict["story_count"] = story_count
            data.append(m_dict)

        return {
            "data": data,
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
        logger.error("Unexpected error in list_milestones: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def get_milestone(
    id: str,
    service: MilestoneService = Depends(provide_milestone_service),
) -> dict:
    try:
        milestone, story_count = service.get_with_story_count(id)
        m_dict = Milestone.model_validate(milestone).model_dump()
        m_dict["story_count"] = story_count
        return {"data": m_dict}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in get_milestone: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def update_milestone(
    id: str,
    body: UpdateMilestone,
    service: MilestoneService = Depends(provide_milestone_service),
) -> dict:
    try:
        milestone = service.update(milestone_id=id, data=body)
        return {"data": Milestone.model_validate(milestone).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in update_milestone: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def delete_milestone(
    id: str,
    service: MilestoneService = Depends(provide_milestone_service),
) -> dict:
    try:
        service.delete(id)
        return {"success": True}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in delete_milestone: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def activate_milestone(
    id: str,
    service: MilestoneService = Depends(provide_milestone_service),
) -> dict:
    try:
        milestone = service.activate(id)
        return {"data": Milestone.model_validate(milestone).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in activate_milestone: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def finish_milestone(
    id: str,
    service: MilestoneService = Depends(provide_milestone_service),
) -> dict:
    try:
        milestone = service.finish(id)
        return {"data": Milestone.model_validate(milestone).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in finish_milestone: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def get_milestone_detail(
    id: str,
    service: MilestoneService = Depends(provide_milestone_service),
) -> dict:
    try:
        milestone, attachments, comments = service.get_detail(id)
        detail = MilestoneDetail.model_validate(milestone)
        detail.attachments = [a.model_dump(mode="json") for a in attachments]
        detail.comments = [c.model_dump(mode="json") for c in comments]
        return {"data": detail.model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in get_milestone_detail: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def list_milestone_stories(
    id: str,
    page: int = 1,
    limit: int = 20,
    service: MilestoneService = Depends(provide_milestone_service),
) -> dict:
    try:
        stories, total = service.list_stories(milestone_id=id, page=page, limit=limit)
        total_pages = math.ceil(total / limit) if total > 0 else 0
        return {
            "data": [Story.model_validate(s).model_dump() for s in stories],
            "meta": StoryPaginationMeta(
                total=total,
                page=page,
                limit=limit,
                totalPages=total_pages,
            ).model_dump(),
        }
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error(
            "Unexpected error in list_milestone_stories: %s", exc, exc_info=exc
        )
        raise ToolError("Internal server error.") from exc
