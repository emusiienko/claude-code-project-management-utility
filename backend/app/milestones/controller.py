import math

from dependency_injector.wiring import Closing, Provide, inject
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.container.container import AppContainer
from app.milestones.schema import (
    CreateMilestone,
    Milestone,
    PaginationMeta,
    UpdateMilestone,
)
from app.milestones.service import MilestoneService
from app.stories.schema import PaginationMeta as StoryPaginationMeta
from app.stories.schema import Story

router = APIRouter(tags=["milestones"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
@inject
async def create_milestone(
    body: CreateMilestone,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: MilestoneService = Depends(Provide[AppContainer.milestone_service]),
) -> dict:
    milestone = service.create(data=body)
    return {"data": Milestone.model_validate(milestone).model_dump()}


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def list_milestones(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    project_id: str | None = Query(default=None),
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: MilestoneService = Depends(Provide[AppContainer.milestone_service]),
) -> dict:
    rows, total = service.list_paginated(page=page, limit=limit, project_id=project_id)
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


@router.get(
    "/{milestone_id}",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def get_milestone(
    milestone_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: MilestoneService = Depends(Provide[AppContainer.milestone_service]),
) -> dict:
    milestone, story_count = service.get_with_story_count(milestone_id)
    m_dict = Milestone.model_validate(milestone).model_dump()
    m_dict["story_count"] = story_count
    return {"data": m_dict}


@router.put(
    "/{milestone_id}",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def update_milestone(
    milestone_id: str,
    body: UpdateMilestone,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: MilestoneService = Depends(Provide[AppContainer.milestone_service]),
) -> dict:
    milestone = service.update(milestone_id=milestone_id, data=body)
    return {"data": Milestone.model_validate(milestone).model_dump()}


@router.delete(
    "/{milestone_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@inject
async def delete_milestone(
    milestone_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: MilestoneService = Depends(Provide[AppContainer.milestone_service]),
) -> None:
    service.delete(milestone_id)


@router.post(
    "/{milestone_id}/activate",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def activate_milestone(
    milestone_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: MilestoneService = Depends(Provide[AppContainer.milestone_service]),
) -> dict:
    milestone = service.activate(milestone_id)
    return {"data": Milestone.model_validate(milestone).model_dump()}


@router.post(
    "/{milestone_id}/finish",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def finish_milestone(
    milestone_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: MilestoneService = Depends(Provide[AppContainer.milestone_service]),
) -> dict:
    milestone = service.finish(milestone_id)
    return {"data": Milestone.model_validate(milestone).model_dump()}


@router.get(
    "/{milestone_id}/stories",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def list_milestone_stories(
    milestone_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: MilestoneService = Depends(Provide[AppContainer.milestone_service]),
) -> dict:
    stories, total = service.list_stories(
        milestone_id=milestone_id, page=page, limit=limit
    )
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
