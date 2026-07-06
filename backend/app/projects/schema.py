import datetime
import uuid

from pydantic import BaseModel, ConfigDict, field_validator

_NAME_MAX_LEN = 200
_DESC_MAX_LEN = 5000

_NAME_REQUIRED_MSG = "Project name is required."
_NAME_TOO_LONG_MSG = "Project name must not exceed 200 characters."
_DESC_TOO_LONG_MSG = "Project description must not exceed 5000 characters."


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class CreateProject(BaseModel):
    name: str
    description: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_NAME_REQUIRED_MSG)
        return v

    @field_validator("name")
    @classmethod
    def name_not_too_long(cls, v: str) -> str:
        if len(v) > _NAME_MAX_LEN:
            raise ValueError(_NAME_TOO_LONG_MSG)
        return v

    @field_validator("description")
    @classmethod
    def description_not_too_long(cls, v: str | None) -> str | None:
        if v is not None and len(v) > _DESC_MAX_LEN:
            raise ValueError(_DESC_TOO_LONG_MSG)
        return v


class UpdateProject(BaseModel):
    name: str | None = None
    description: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError(_NAME_REQUIRED_MSG)
        return v

    @field_validator("name")
    @classmethod
    def name_not_too_long(cls, v: str | None) -> str | None:
        if v is not None and len(v) > _NAME_MAX_LEN:
            raise ValueError(_NAME_TOO_LONG_MSG)
        return v

    @field_validator("description")
    @classmethod
    def description_not_too_long(cls, v: str | None) -> str | None:
        if v is not None and len(v) > _DESC_MAX_LEN:
            raise ValueError(_DESC_TOO_LONG_MSG)
        return v


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class Project(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    totalPages: int
