import datetime
import uuid

from pydantic import BaseModel, ConfigDict, field_validator

_TITLE_MAX_LEN = 500
_CONTENT_MAX_LEN = 50000

_TITLE_REQUIRED_MSG = "Story title is required."
_TITLE_TOO_LONG_MSG = "Story title must not exceed 500 characters."
_CONTENT_TOO_LONG_MSG = "Story content must not exceed 50000 characters."
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


class CreateStory(BaseModel):
    project_id: str
    title: str
    content: str | None = None
    status: str | None = None
    labels: list[Label] = []
    milestone_id: str | None = None

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


class UpdateStory(BaseModel):
    title: str | None = None
    content: str | None = None
    status: str | None = None
    labels: list[Label] | None = None
    milestone_id: str | None = None

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


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class Story(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    content: str | None
    status: str | None
    labels: list[Label]
    milestone_id: uuid.UUID | None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    totalPages: int
