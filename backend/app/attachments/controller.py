import math

from dependency_injector.wiring import Closing, Provide, inject
from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import StreamingResponse
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile

from app.attachments.schema import (
    CONTAINER_MILESTONE,
    CONTAINER_STORY,
    CONTAINER_TASK,
    KIND_DOCUMENT,
    KIND_EXTERNAL_REF,
    TITLE_MAX_LENGTH,
    Attachment,
    AttachmentCreateInput,
    CreateAttachmentJsonAdapter,
    CreateDocumentAttachmentJson,
    CreateStoredFileAttachmentForm,
    PaginationMeta,
)
from app.attachments.service import AttachmentService
from app.container.container import AppContainer

# Routes under /stories/:storyId/attachments
stories_attachments_router = APIRouter(tags=["attachments"])

# Routes under /tasks/:taskId/attachments
tasks_attachments_router = APIRouter(tags=["attachments"])

# Routes under /milestones/:id/attachments
milestones_attachments_router = APIRouter(tags=["attachments"])

# Routes under /attachments/:id
attachments_top_router = APIRouter(tags=["attachments"])

_UNSUPPORTED_CONTENT_TYPE_MSG = (
    "Content-Type must be application/json or multipart/form-data."
)
_FILE_REQUIRED_MSG = "file is required for a multipart attachment create."


# ---------------------------------------------------------------------------
# Shared create/list logic — one implementation, three container routers.
# ---------------------------------------------------------------------------


async def _build_create_input(request: Request) -> AttachmentCreateInput:
    content_type = request.headers.get("content-type", "")

    if content_type.startswith("application/json"):
        return await _build_create_input_from_json(request)

    if content_type.startswith("multipart/form-data"):
        return await _build_create_input_from_multipart(request)

    raise RequestValidationError(
        [
            {
                "loc": ("header", "content-type"),
                "msg": _UNSUPPORTED_CONTENT_TYPE_MSG,
                "type": "value_error",
            }
        ]
    )


async def _build_create_input_from_json(request: Request) -> AttachmentCreateInput:
    try:
        raw_body = await request.json()
    except Exception as exc:  # noqa: BLE001 - malformed JSON surfaces as 422
        raise RequestValidationError(
            [
                {
                    "loc": ("body",),
                    "msg": "Invalid JSON body.",
                    "type": "value_error.jsondecode",
                }
            ]
        ) from exc

    try:
        parsed = CreateAttachmentJsonAdapter.validate_python(raw_body)
    except PydanticValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc

    if isinstance(parsed, CreateDocumentAttachmentJson):
        return AttachmentCreateInput(
            title=parsed.title,
            kind=KIND_DOCUMENT,
            text_content=parsed.content,
            mime_type=parsed.mime_type,
            author_role=parsed.author_role,
        )

    return AttachmentCreateInput(
        title=parsed.title,
        kind=KIND_EXTERNAL_REF,
        external_url=parsed.external_url,
        external_status=parsed.external_status,
        author_role=parsed.author_role,
    )


async def _build_create_input_from_multipart(request: Request) -> AttachmentCreateInput:
    form = await request.form()
    upload = form.get("file")
    if not isinstance(upload, UploadFile):
        raise RequestValidationError(
            [
                {
                    "loc": ("body", "file"),
                    "msg": _FILE_REQUIRED_MSG,
                    "type": "value_error.missing",
                }
            ]
        )

    try:
        fields = CreateStoredFileAttachmentForm.model_validate(
            {
                "title": form.get("title"),
                "kind": form.get("kind"),
                "mime_type": form.get("mime_type"),
                "author_role": form.get("author_role"),
            }
        )
    except PydanticValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc

    # title absent from the form (None) defaults to the uploaded file's name,
    # truncated to fit; title present-but-empty already failed schema
    # validation above and never reaches here.
    title = fields.title or _default_title_from_filename(upload.filename)

    file_bytes = await upload.read()
    return AttachmentCreateInput(
        title=title,
        kind=fields.kind,
        file_bytes=file_bytes,
        mime_type=fields.mime_type,
        author_role=fields.author_role,
    )


def _default_title_from_filename(filename: str | None) -> str:
    return (filename or "")[:TITLE_MAX_LENGTH]


async def _create_attachment(
    container_type: str,
    container_id: str,
    request: Request,
    service: AttachmentService,
) -> dict:
    data = await _build_create_input(request)
    attachment = service.create(
        container_type=container_type, container_id=container_id, data=data
    )
    return {"data": Attachment.model_validate(attachment).model_dump(mode="json")}


def _list_attachments(
    container_type: str,
    container_id: str,
    page: int,
    limit: int,
    kind_filter: str | None,
    service: AttachmentService,
) -> dict:
    attachments, total = service.list_paginated(
        container_type=container_type,
        container_id=container_id,
        page=page,
        limit=limit,
        kind_filter=kind_filter,
    )
    total_pages = math.ceil(total / limit) if total > 0 else 0
    return {
        "data": [
            Attachment.model_validate(a).model_dump(mode="json") for a in attachments
        ],
        "meta": PaginationMeta(
            total=total, page=page, limit=limit, totalPages=total_pages
        ).model_dump(),
    }


# ---------------------------------------------------------------------------
# /stories/:storyId/attachments
# ---------------------------------------------------------------------------


@stories_attachments_router.post(
    "/{story_id}/attachments",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
@inject
async def create_story_attachment(
    story_id: str,
    request: Request,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: AttachmentService = Depends(Provide[AppContainer.attachment_service]),
) -> dict:
    return await _create_attachment(CONTAINER_STORY, story_id, request, service)


@stories_attachments_router.get(
    "/{story_id}/attachments",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def list_story_attachments(
    story_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    kind_filter: str | None = Query(default=None, alias="kind"),
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: AttachmentService = Depends(Provide[AppContainer.attachment_service]),
) -> dict:
    return _list_attachments(
        CONTAINER_STORY, story_id, page, limit, kind_filter, service
    )


# ---------------------------------------------------------------------------
# /tasks/:taskId/attachments
# ---------------------------------------------------------------------------


@tasks_attachments_router.post(
    "/{task_id}/attachments",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
@inject
async def create_task_attachment(
    task_id: str,
    request: Request,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: AttachmentService = Depends(Provide[AppContainer.attachment_service]),
) -> dict:
    return await _create_attachment(CONTAINER_TASK, task_id, request, service)


@tasks_attachments_router.get(
    "/{task_id}/attachments",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def list_task_attachments(
    task_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    kind_filter: str | None = Query(default=None, alias="kind"),
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: AttachmentService = Depends(Provide[AppContainer.attachment_service]),
) -> dict:
    return _list_attachments(CONTAINER_TASK, task_id, page, limit, kind_filter, service)


# ---------------------------------------------------------------------------
# /milestones/:id/attachments
# ---------------------------------------------------------------------------


@milestones_attachments_router.post(
    "/{milestone_id}/attachments",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
@inject
async def create_milestone_attachment(
    milestone_id: str,
    request: Request,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: AttachmentService = Depends(Provide[AppContainer.attachment_service]),
) -> dict:
    return await _create_attachment(CONTAINER_MILESTONE, milestone_id, request, service)


@milestones_attachments_router.get(
    "/{milestone_id}/attachments",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def list_milestone_attachments(
    milestone_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    kind_filter: str | None = Query(default=None, alias="kind"),
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: AttachmentService = Depends(Provide[AppContainer.attachment_service]),
) -> dict:
    return _list_attachments(
        CONTAINER_MILESTONE,
        milestone_id,
        page,
        limit,
        kind_filter,
        service,
    )


# ---------------------------------------------------------------------------
# /attachments/:id — top-level routes (no update route: attachments are immutable)
# ---------------------------------------------------------------------------


@attachments_top_router.get(
    "/{attachment_id}",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def get_attachment(
    attachment_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: AttachmentService = Depends(Provide[AppContainer.attachment_service]),
) -> dict:
    attachment = service.get_by_id(attachment_id)
    return {"data": Attachment.model_validate(attachment).model_dump(mode="json")}


@attachments_top_router.get("/{attachment_id}/file")
@inject
async def get_attachment_file(
    attachment_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: AttachmentService = Depends(Provide[AppContainer.attachment_service]),
) -> StreamingResponse:
    content, mime_type = service.get_file(attachment_id)
    return StreamingResponse(iter([content]), media_type=mime_type)


@attachments_top_router.delete(
    "/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@inject
async def delete_attachment(
    attachment_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: AttachmentService = Depends(Provide[AppContainer.attachment_service]),
) -> None:
    service.delete(attachment_id)
