import math

from dependency_injector.wiring import Closing, Provide, inject
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session as DbSession

from app.container.container import AppContainer
from app.sessions.schema import (
    CreateSession,
    PaginationMeta,
    Session,
    UpdateSession,
)
from app.sessions.service import SessionService

router = APIRouter(tags=["sessions"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
@inject
async def create_session(
    body: CreateSession,
    _db: DbSession = Depends(Closing[Provide[AppContainer.db_session]]),
    service: SessionService = Depends(Provide[AppContainer.session_service]),
) -> dict:
    session = service.create(data=body)
    return {"data": Session.model_validate(session).model_dump()}


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def list_sessions(
    project_id: str = Query(...),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    incomplete: bool = Query(default=False),
    linked_story_id: str | None = Query(default=None),
    include_archived: bool = Query(default=False),
    _db: DbSession = Depends(Closing[Provide[AppContainer.db_session]]),
    service: SessionService = Depends(Provide[AppContainer.session_service]),
) -> dict:
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


@router.get(
    "/{session_id}",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def get_session(
    session_id: str,
    _db: DbSession = Depends(Closing[Provide[AppContainer.db_session]]),
    service: SessionService = Depends(Provide[AppContainer.session_service]),
) -> dict:
    session = service.get_by_id(session_id)
    return {"data": Session.model_validate(session).model_dump()}


@router.put(
    "/{session_id}",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def update_session(
    session_id: str,
    body: UpdateSession,
    _db: DbSession = Depends(Closing[Provide[AppContainer.db_session]]),
    service: SessionService = Depends(Provide[AppContainer.session_service]),
) -> dict:
    session = service.update(session_id=session_id, data=body)
    return {"data": Session.model_validate(session).model_dump()}


@router.post(
    "/{session_id}/archive",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def archive_session(
    session_id: str,
    _db: DbSession = Depends(Closing[Provide[AppContainer.db_session]]),
    service: SessionService = Depends(Provide[AppContainer.session_service]),
) -> dict:
    session = service.archive(session_id)
    return {"data": Session.model_validate(session).model_dump()}


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@inject
async def delete_session(
    session_id: str,
    _db: DbSession = Depends(Closing[Provide[AppContainer.db_session]]),
    service: SessionService = Depends(Provide[AppContainer.session_service]),
) -> None:
    service.delete(session_id)
