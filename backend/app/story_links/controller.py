import math

from dependency_injector.wiring import Closing, Provide, inject
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.container.container import AppContainer
from app.story_links.schema import (
    CreateStoryLink,
    PaginationMeta,
    StoryLink,
)
from app.story_links.service import StoryLinkService

# Routes under /stories/:storyId/links
story_links_router = APIRouter(tags=["story-links"])

# Routes under /story-links/:id
story_links_top_router = APIRouter(tags=["story-links"])


@story_links_router.post(
    "/{story_id}/links",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
@inject
async def create_story_link(
    story_id: str,
    body: CreateStoryLink,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: StoryLinkService = Depends(Provide[AppContainer.story_link_service]),
) -> dict:
    link = service.create(source_story_id=story_id, data=body)
    return {"data": StoryLink.model_validate(link).model_dump()}


@story_links_router.get(
    "/{story_id}/links",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def list_story_links(
    story_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    direction: str = Query(default="both"),
    link_type: str | None = Query(default=None),
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: StoryLinkService = Depends(Provide[AppContainer.story_link_service]),
) -> dict:
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


@story_links_top_router.delete(
    "/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@inject
async def delete_story_link(
    link_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: StoryLinkService = Depends(Provide[AppContainer.story_link_service]),
) -> None:
    service.delete(link_id=link_id)
