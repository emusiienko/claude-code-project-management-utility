import datetime
import uuid

from pydantic import BaseModel, ConfigDict, field_validator

_NAME_MAX_LEN = 200
_DESC_MAX_LEN = 5000

_NAME_REQUIRED_MSG = "Milestone name is required."
_NAME_TOO_LONG_MSG = "Milestone name must not exceed 200 characters."
_DESC_TOO_LONG_MSG = "Milestone description must not exceed 5000 characters."

# Lowercase wire values per the v1.2 contract.
MILESTONE_STATUS_PLANNED = "planned"
MILESTONE_STATUS_ACTIVE = "active"
MILESTONE_STATUS_FINISHED = "finished"

MILESTONE_STATUSES = {
    MILESTONE_STATUS_PLANNED,
    MILESTONE_STATUS_ACTIVE,
    MILESTONE_STATUS_FINISHED,
}


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class CreateMilestone(BaseModel):
    name: str
    project_id: str
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


class UpdateMilestone(BaseModel):
    # project_id is immutable after create — not accepted here.
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


class Milestone(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    project_id: uuid.UUID
    status: str
    story_count: int | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class MilestoneDetail(Milestone):
    # comments stays empty pending STORY-008, matching how story/task detail
    # composition was staged (see architecture.md Known Divergences).
    attachments: list[dict] = []
    comments: list[dict] = []


class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    totalPages: int
