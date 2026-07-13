import math

from dependency_injector.wiring import Closing, Provide, inject
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.container.container import AppContainer
from app.tasks.schema import (
    CreateTask,
    PaginationMeta,
    Task,
    TaskDetail,
    UpdateTask,
)
from app.tasks.service import TaskService

# Routes under /stories/:storyId/tasks
stories_router = APIRouter(tags=["tasks"])

# Routes under /tasks/:id
tasks_router = APIRouter(tags=["tasks"])


@stories_router.post(
    "/{story_id}/tasks",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
@inject
async def create_task(
    story_id: str,
    body: CreateTask,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: TaskService = Depends(Provide[AppContainer.task_service]),
) -> dict:
    task = service.create(story_id=story_id, data=body)
    return {"data": Task.model_validate(task).model_dump()}


@stories_router.get(
    "/{story_id}/tasks",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def list_tasks(
    story_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    type_filter: str | None = Query(default=None, alias="type"),
    assignee_role: str | None = Query(default=None),
    creator_role: str | None = Query(default=None),
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: TaskService = Depends(Provide[AppContainer.task_service]),
) -> dict:
    tasks, total = service.list_paginated(
        story_id=story_id,
        page=page,
        limit=limit,
        status_filter=status_filter,
        type_filter=type_filter,
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


@tasks_router.get(
    "/{task_id}",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def get_task(
    task_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: TaskService = Depends(Provide[AppContainer.task_service]),
) -> dict:
    task = service.get_by_id(task_id)
    return {"data": Task.model_validate(task).model_dump()}


@tasks_router.get(
    "/{task_id}/detail",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def get_task_detail(
    task_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: TaskService = Depends(Provide[AppContainer.task_service]),
) -> dict:
    task, links = service.get_detail(task_id)
    detail = TaskDetail.model_validate(task)
    detail.links = [lnk.model_dump() for lnk in links]
    return {"data": detail.model_dump()}


@tasks_router.put(
    "/{task_id}",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def update_task(
    task_id: str,
    body: UpdateTask,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: TaskService = Depends(Provide[AppContainer.task_service]),
) -> dict:
    task = service.update(task_id=task_id, data=body)
    return {"data": Task.model_validate(task).model_dump()}


@tasks_router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@inject
async def delete_task(
    task_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: TaskService = Depends(Provide[AppContainer.task_service]),
) -> None:
    service.delete(task_id=task_id)
