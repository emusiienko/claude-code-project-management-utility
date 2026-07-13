import logging
import math

from fastmcp.dependencies import Depends
from fastmcp.exceptions import ToolError

from app.container.mcp_dependencies import provide_story_link_service
from app.core.errors import DomainError
from app.mcp.server import mcp_server_v1
from app.story_links.schema import (
    CreateStoryLink,
    PaginationMeta,
    StoryLink,
)
from app.story_links.service import StoryLinkService

logger = logging.getLogger(__name__)


@mcp_server_v1.tool()
async def create_story_link(
    story_id: str,
    body: CreateStoryLink,
    service: StoryLinkService = Depends(provide_story_link_service),
) -> dict:
    try:
        link = service.create(source_story_id=story_id, data=body)
        return {"data": StoryLink.model_validate(link).model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in create_story_link: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def list_story_links(
    story_id: str,
    page: int = 1,
    limit: int = 20,
    direction: str = "both",
    link_type: str | None = None,
    service: StoryLinkService = Depends(provide_story_link_service),
) -> dict:
    try:
        enriched_links, total = service.list_for_story(
            story_id=story_id,
            page=page,
            limit=limit,
            direction=direction,
            link_type_filter=link_type,
        )
        total_pages = math.ceil(total / limit) if total > 0 else 0
        return {
            "data": [lnk.model_dump() for lnk in enriched_links],
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
        logger.error("Unexpected error in list_story_links: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def delete_story_link(
    id: str,
    service: StoryLinkService = Depends(provide_story_link_service),
) -> dict:
    try:
        service.delete(link_id=id)
        return {"success": True}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in delete_story_link: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc
