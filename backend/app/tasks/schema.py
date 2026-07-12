import datetime
import uuid

from pydantic import BaseModel, ConfigDict, field_validator

_TITLE_MAX_LEN = 500
_CONTENT_MAX_LEN = 50000

_TITLE_REQUIRED_MSG = "Task title is required."
_TITLE_TOO_LONG_MSG = "Task title must not exceed 500 characters."
_CONTENT_TOO_LONG_MSG = "Task content must not exceed 50000 characters."
_TYPE_REQUIRED_MSG = "Task type is required."
_STATUS_REQUIRED_MSG = "Task status is required."
_LABEL_KEY_REQUIRED_MSG = "Label key is required and must not be empty."


# ---------------------------------------------------------------------------
# Nested schemas
# ---------------------------------------------------------------------------


class Label(BaseModel):
    key: str
    value: str

    @field_validator("key")
    @classmethod
    def key_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_LABEL_KEY_REQUIRED_MSG)
        return v


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class CreateTask(BaseModel):
    title: str
    content: str | None = None
    type: str
    status: str
    assignee_role: str | None = None
    creator_role: str | None = None
    labels: list[Label] = []

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_TITLE_REQUIRED_MSG)
        return v

    @field_validator("title")
    @classmethod
    def title_not_too_long(cls, v: str) -> str:
        if len(v) > _TITLE_MAX_LEN:
            raise ValueError(_TITLE_TOO_LONG_MSG)
        return v

    @field_validator("content")
    @classmethod
    def content_not_too_long(cls, v: str | None) -> str | None:
        if v is not None and len(v) > _CONTENT_MAX_LEN:
            raise ValueError(_CONTENT_TOO_LONG_MSG)
        return v

    @field_validator("type")
    @classmethod
    def type_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_TYPE_REQUIRED_MSG)
        return v

    @field_validator("status")
    @classmethod
    def status_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_STATUS_REQUIRED_MSG)
        return v


class UpdateTask(BaseModel):
    title: str | None = None
    content: str | None = None
    type: str | None = None
    status: str | None = None
    assignee_role: str | None = None
    creator_role: str | None = None
    labels: list[Label] | None = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError(_TITLE_REQUIRED_MSG)
        return v

    @field_validator("title")
    @classmethod
    def title_not_too_long(cls, v: str | None) -> str | None:
        if v is not None and len(v) > _TITLE_MAX_LEN:
            raise ValueError(_TITLE_TOO_LONG_MSG)
        return v

    @field_validator("content")
    @classmethod
    def content_not_too_long(cls, v: str | None) -> str | None:
        if v is not None and len(v) > _CONTENT_MAX_LEN:
            raise ValueError(_CONTENT_TOO_LONG_MSG)
        return v

    @field_validator("type")
    @classmethod
    def type_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError(_TYPE_REQUIRED_MSG)
        return v

    @field_validator("status")
    @classmethod
    def status_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError(_STATUS_REQUIRED_MSG)
        return v


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class Task(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    story_id: uuid.UUID
    title: str
    content: str | None
    type: str
    status: str
    assignee_role: str | None
    creator_role: str | None
    labels: list[Label]
    created_at: datetime.datetime
    updated_at: datetime.datetime


class TaskDetail(Task):
    links: list[dict] = []
    attachments: list[dict] = []
    comments: list[dict] = []


class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    totalPages: int
