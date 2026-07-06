import math

from dependency_injector.wiring import Closing, Provide, inject
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.container.container import AppContainer
from app.projects.schema import (
    CreateProject,
    PaginationMeta,
    Project,
    UpdateProject,
)
from app.projects.service import ProjectService

router = APIRouter(tags=["projects"])


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
@inject
async def create_project(
    body: CreateProject,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: ProjectService = Depends(Provide[AppContainer.project_service]),
) -> dict:
    project = service.create(name=body.name, description=body.description)
    return {"data": Project.model_validate(project).model_dump()}


@router.get(
    "/",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def list_projects(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: ProjectService = Depends(Provide[AppContainer.project_service]),
) -> dict:
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


@router.get(
    "/{project_id}",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def get_project(
    project_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: ProjectService = Depends(Provide[AppContainer.project_service]),
) -> dict:
    project = service.get(project_id)
    return {"data": Project.model_validate(project).model_dump()}


@router.put(
    "/{project_id}",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def update_project(
    project_id: str,
    body: UpdateProject,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: ProjectService = Depends(Provide[AppContainer.project_service]),
) -> dict:
    project = service.update(
        project_id=project_id,
        name=body.name,
        description=body.description,
    )
    return {"data": Project.model_validate(project).model_dump()}


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@inject
async def delete_project(
    project_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: ProjectService = Depends(Provide[AppContainer.project_service]),
) -> None:
    service.delete(project_id)
