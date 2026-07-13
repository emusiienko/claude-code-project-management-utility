import datetime
import uuid

from pydantic import BaseModel, ConfigDict, field_validator

_LINK_TYPE_REQUIRED_MSG = "link_type is required and must not be empty."
_TARGET_STORY_ID_REQUIRED_MSG = "target_story_id is required and must not be empty."


# ---------------------------------------------------------------------------
# Nested schemas
# ---------------------------------------------------------------------------


class LinkedStorySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    status: str | None


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class CreateStoryLink(BaseModel):
    target_story_id: str
    link_type: str

    @field_validator("target_story_id")
    @classmethod
    def target_story_id_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_TARGET_STORY_ID_REQUIRED_MSG)
        return v

    @field_validator("link_type")
    @classmethod
    def link_type_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_LINK_TYPE_REQUIRED_MSG)
        return v


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class StoryLink(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source_story_id: uuid.UUID
    target_story_id: uuid.UUID
    link_type: str
    created_at: datetime.datetime


class EnrichedStoryLink(BaseModel):
    id: uuid.UUID
    source_story_id: uuid.UUID
    target_story_id: uuid.UUID
    link_type: str
    created_at: datetime.datetime
    direction: str
    linked_story: LinkedStorySummary


class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    totalPages: int
