import math

from dependency_injector.wiring import Closing, Provide, inject
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.comments.schema import (
    CONTAINER_MILESTONE,
    CONTAINER_STORY,
    CONTAINER_TASK,
    Comment,
    CreateComment,
    PaginationMeta,
    UpdateComment,
)
from app.comments.service import CommentService
from app.container.container import AppContainer

# Routes under /stories/:storyId/comments
stories_comments_router = APIRouter(tags=["comments"])

# Routes under /tasks/:taskId/comments
tasks_comments_router = APIRouter(tags=["comments"])

# Routes under /milestones/:id/comments
milestones_comments_router = APIRouter(tags=["comments"])

# Routes under /comments/:id
comments_top_router = APIRouter(tags=["comments"])

_LIST_DEFAULT_LIMIT = 50


# ---------------------------------------------------------------------------
# Shared create/list logic — one implementation, three container routers.
# ---------------------------------------------------------------------------


def _create_comment(
    container_type: str,
    container_id: str,
    body: CreateComment,
    service: CommentService,
) -> dict:
    comment = service.create(
        container_type=container_type, container_id=container_id, data=body
    )
    return {"data": Comment.model_validate(comment).model_dump(mode="json")}


def _list_comments(
    container_type: str,
    container_id: str,
    page: int,
    limit: int,
    label_key: str | None,
    label_value: str | None,
    after_id: str | None,
    descendant_of: str | None,
    service: CommentService,
) -> dict:
    comments, total = service.list_paginated(
        container_type=container_type,
        container_id=container_id,
        page=page,
        limit=limit,
        label_key_filter=label_key,
        label_value_filter=label_value,
        descendant_of_filter=descendant_of,
        after_id_filter=after_id,
    )
    total_pages = math.ceil(total / limit) if total > 0 else 0
    return {
        "data": [Comment.model_validate(c).model_dump(mode="json") for c in comments],
        "meta": PaginationMeta(
            total=total, page=page, limit=limit, totalPages=total_pages
        ).model_dump(),
    }


# ---------------------------------------------------------------------------
# /stories/:storyId/comments
# ---------------------------------------------------------------------------


@stories_comments_router.post(
    "/{story_id}/comments",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
@inject
async def create_story_comment(
    story_id: str,
    body: CreateComment,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: CommentService = Depends(Provide[AppContainer.comment_service]),
) -> dict:
    return _create_comment(CONTAINER_STORY, story_id, body, service)


@stories_comments_router.get(
    "/{story_id}/comments",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def list_story_comments(
    story_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=_LIST_DEFAULT_LIMIT, ge=1, le=100),
    label_key: str | None = Query(default=None),
    label_value: str | None = Query(default=None),
    after_id: str | None = Query(default=None),
    descendant_of: str | None = Query(default=None),
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: CommentService = Depends(Provide[AppContainer.comment_service]),
) -> dict:
    return _list_comments(
        CONTAINER_STORY,
        story_id,
        page,
        limit,
        label_key,
        label_value,
        after_id,
        descendant_of,
        service,
    )


# ---------------------------------------------------------------------------
# /tasks/:taskId/comments
# ---------------------------------------------------------------------------


@tasks_comments_router.post(
    "/{task_id}/comments",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
@inject
async def create_task_comment(
    task_id: str,
    body: CreateComment,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: CommentService = Depends(Provide[AppContainer.comment_service]),
) -> dict:
    return _create_comment(CONTAINER_TASK, task_id, body, service)


@tasks_comments_router.get(
    "/{task_id}/comments",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def list_task_comments(
    task_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=_LIST_DEFAULT_LIMIT, ge=1, le=100),
    label_key: str | None = Query(default=None),
    label_value: str | None = Query(default=None),
    after_id: str | None = Query(default=None),
    descendant_of: str | None = Query(default=None),
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: CommentService = Depends(Provide[AppContainer.comment_service]),
) -> dict:
    return _list_comments(
        CONTAINER_TASK,
        task_id,
        page,
        limit,
        label_key,
        label_value,
        after_id,
        descendant_of,
        service,
    )


# ---------------------------------------------------------------------------
# /milestones/:id/comments
# ---------------------------------------------------------------------------


@milestones_comments_router.post(
    "/{milestone_id}/comments",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
@inject
async def create_milestone_comment(
    milestone_id: str,
    body: CreateComment,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: CommentService = Depends(Provide[AppContainer.comment_service]),
) -> dict:
    return _create_comment(CONTAINER_MILESTONE, milestone_id, body, service)


@milestones_comments_router.get(
    "/{milestone_id}/comments",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def list_milestone_comments(
    milestone_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=_LIST_DEFAULT_LIMIT, ge=1, le=100),
    label_key: str | None = Query(default=None),
    label_value: str | None = Query(default=None),
    after_id: str | None = Query(default=None),
    descendant_of: str | None = Query(default=None),
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: CommentService = Depends(Provide[AppContainer.comment_service]),
) -> dict:
    return _list_comments(
        CONTAINER_MILESTONE,
        milestone_id,
        page,
        limit,
        label_key,
        label_value,
        after_id,
        descendant_of,
        service,
    )


# ---------------------------------------------------------------------------
# /comments/:id — top-level routes
# ---------------------------------------------------------------------------


@comments_top_router.get(
    "/{comment_id}",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def get_comment(
    comment_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: CommentService = Depends(Provide[AppContainer.comment_service]),
) -> dict:
    comment = service.get_by_id(comment_id)
    return {"data": Comment.model_validate(comment).model_dump(mode="json")}


@comments_top_router.get(
    "/{comment_id}/ancestors",
    status_code=status.HTTP_200_OK,
    response_model=list[dict],
)
@inject
async def get_comment_ancestors(
    comment_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: CommentService = Depends(Provide[AppContainer.comment_service]),
) -> list[dict]:
    # Bare ordered (root-first) Comment[] — unpaginated, no envelope, since the
    # lineage is bounded by thread depth rather than a listable collection.
    ancestors = service.get_ancestors(comment_id)
    return [Comment.model_validate(a).model_dump(mode="json") for a in ancestors]


@comments_top_router.put(
    "/{comment_id}",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def update_comment(
    comment_id: str,
    body: UpdateComment,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: CommentService = Depends(Provide[AppContainer.comment_service]),
) -> dict:
    comment = service.update(comment_id=comment_id, data=body)
    return {"data": Comment.model_validate(comment).model_dump(mode="json")}


@comments_top_router.delete(
    "/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@inject
async def delete_comment(
    comment_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: CommentService = Depends(Provide[AppContainer.comment_service]),
) -> None:
    service.delete(comment_id)
