import math

from dependency_injector.wiring import Closing, Provide, inject
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.container.container import AppContainer
from app.stories.schema import (
    CreateStory,
    PaginationMeta,
    Story,
    UpdateStory,
)
from app.stories.service import StoryService

router = APIRouter(tags=["stories"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
@inject
async def create_story(
    body: CreateStory,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: StoryService = Depends(Provide[AppContainer.story_service]),
) -> dict:
    story = service.create(data=body)
    return {"data": Story.model_validate(story).model_dump()}


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def list_stories(
    project_id: str = Query(...),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    label_key: str | None = Query(default=None),
    label_value: str | None = Query(default=None),
    milestone_id: str | None = Query(default=None),
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: StoryService = Depends(Provide[AppContainer.story_service]),
) -> dict:
    stories, total = service.list_paginated(
        project_id=project_id,
        page=page,
        limit=limit,
        status_filter=status_filter,
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


@router.get(
    "/{story_id}",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def get_story(
    story_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: StoryService = Depends(Provide[AppContainer.story_service]),
) -> dict:
    story = service.get_by_id(story_id)
    return {"data": Story.model_validate(story).model_dump()}


@router.put(
    "/{story_id}",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def update_story(
    story_id: str,
    body: UpdateStory,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: StoryService = Depends(Provide[AppContainer.story_service]),
) -> dict:
    # Fetch the story first to resolve the project_id required by the service layer.
    existing = service.get_by_id(story_id)
    story = service.update(
        story_id=story_id,
        project_id=str(existing.project_id),
        data=body,
    )
    return {"data": Story.model_validate(story).model_dump()}


@router.delete(
    "/{story_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@inject
async def delete_story(
    story_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: StoryService = Depends(Provide[AppContainer.story_service]),
) -> None:
    existing = service.get_by_id(story_id)
    service.delete(
        story_id=story_id,
        project_id=str(existing.project_id),
    )
