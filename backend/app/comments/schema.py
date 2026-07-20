import datetime
import uuid

from pydantic import BaseModel, ConfigDict, field_validator

# ---------------------------------------------------------------------------
# Domain constants — single source of truth for comment container types.
# Defined locally (not imported from app.attachments.schema) so the comments
# package stays independent of the attachments domain even though the two
# polymorphic-container conventions happen to share the same three values.
# ---------------------------------------------------------------------------

CONTAINER_STORY = "story"
CONTAINER_TASK = "task"
CONTAINER_MILESTONE = "milestone"
ALL_CONTAINER_TYPES: frozenset[str] = frozenset(
    {CONTAINER_STORY, CONTAINER_TASK, CONTAINER_MILESTONE}
)

CONTENT_MAX_LENGTH = 50000

_LABEL_KEY_REQUIRED_MSG = "Label key is required and must not be empty."
_CONTENT_REQUIRED_MSG = "Comment content is required."
_CONTENT_TOO_LONG_MSG = (
    f"Comment content must not exceed {CONTENT_MAX_LENGTH} characters."
)
_AUTHOR_ROLE_REQUIRED_MSG = "Comment author is required."


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


class CreateComment(BaseModel):
    content: str
    author_role: str
    labels: list[Label] = []
    in_reply_to: str | None = None

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_CONTENT_REQUIRED_MSG)
        return v

    @field_validator("content")
    @classmethod
    def content_not_too_long(cls, v: str) -> str:
        if len(v) > CONTENT_MAX_LENGTH:
            raise ValueError(_CONTENT_TOO_LONG_MSG)
        return v

    @field_validator("author_role")
    @classmethod
    def author_role_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_AUTHOR_ROLE_REQUIRED_MSG)
        return v


class UpdateComment(BaseModel):
    content: str | None = None
    labels: list[Label] | None = None

    @field_validator("content")
    @classmethod
    def content_not_empty_when_present(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError(_CONTENT_REQUIRED_MSG)
        return v

    @field_validator("content")
    @classmethod
    def content_not_too_long_when_present(cls, v: str | None) -> str | None:
        if v is not None and len(v) > CONTENT_MAX_LENGTH:
            raise ValueError(_CONTENT_TOO_LONG_MSG)
        return v


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class Comment(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    container_type: str
    container_id: uuid.UUID
    content: str
    author_role: str
    labels: list[Label]
    ancestors: list[uuid.UUID]
    created_at: datetime.datetime
    updated_at: datetime.datetime


class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    totalPages: int
