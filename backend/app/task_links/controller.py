import math

from dependency_injector.wiring import Closing, Provide, inject
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.container.container import AppContainer
from app.task_links.schema import (
    CreateTaskLink,
    PaginationMeta,
    TaskLink,
)
from app.task_links.service import TaskLinkService

# Routes under /tasks/:taskId/links
task_links_router = APIRouter(tags=["task-links"])

# Routes under /task-links/:id
task_links_top_router = APIRouter(tags=["task-links"])


@task_links_router.post(
    "/{task_id}/links",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
@inject
async def create_task_link(
    task_id: str,
    body: CreateTaskLink,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: TaskLinkService = Depends(Provide[AppContainer.task_link_service]),
) -> dict:
    link = service.create(source_task_id=task_id, data=body)
    return {"data": TaskLink.model_validate(link).model_dump()}


@task_links_router.get(
    "/{task_id}/links",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def list_task_links(
    task_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    direction: str = Query(default="both"),
    link_type: str | None = Query(default=None),
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: TaskLinkService = Depends(Provide[AppContainer.task_link_service]),
) -> dict:
    enriched_links, total = service.list_for_task(
        task_id=task_id,
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


@task_links_top_router.delete(
    "/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@inject
async def delete_task_link(
    link_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: TaskLinkService = Depends(Provide[AppContainer.task_link_service]),
) -> None:
    service.delete(link_id=link_id)
