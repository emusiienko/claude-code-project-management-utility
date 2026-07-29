import datetime
import uuid

from pydantic import BaseModel, ConfigDict, field_validator

TOPIC_MAX_LENGTH = 500
GOAL_MAX_LENGTH = 500

# Fixed 3-value session lifecycle enum — deliberately not dictionary-validated,
# unlike task_statuses/story_statuses (a session's lifecycle is fixed, not
# configurable per project). Order matters: it drives the 422 message below.
SESSION_STATUS_PENDING = "pending"
SESSION_STATUS_IN_PROGRESS = "in-progress"
SESSION_STATUS_FINISHED = "finished"
ALL_SESSION_STATUSES = (
    SESSION_STATUS_PENDING,
    SESSION_STATUS_IN_PROGRESS,
    SESSION_STATUS_FINISHED,
)

_TOPIC_REQUIRED_MSG = "topic is required and must not be empty."
_TOPIC_TOO_LONG_MSG = f"topic must not exceed {TOPIC_MAX_LENGTH} characters."
_GOAL_REQUIRED_MSG = "goal is required and must not be empty."
_GOAL_TOO_LONG_MSG = f"goal must not exceed {GOAL_MAX_LENGTH} characters."
_PARTICIPANT_ROLE_REQUIRED_MSG = (
    "participant_role is required and must not be empty."
)
_STATUS_REQUIRED_MSG = "status cannot be null."
_STATUS_NOT_ALLOWED_MSG = (
    "Value '{v}' is not allowed. Allowed: " + ", ".join(ALL_SESSION_STATUSES) + "."
)


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class CreateSession(BaseModel):
    # status is intentionally absent — never a create input. Every session is
    # created at SESSION_STATUS_PENDING regardless of what a caller sends.
    project_id: str
    topic: str
    goal: str
    context: str | None = None
    participant_role: str
    linked_story_id: str | None = None
    linked_task_id: str | None = None

    @field_validator("topic")
    @classmethod
    def topic_valid(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_TOPIC_REQUIRED_MSG)
        if len(v) > TOPIC_MAX_LENGTH:
            raise ValueError(_TOPIC_TOO_LONG_MSG)
        return v

    @field_validator("goal")
    @classmethod
    def goal_valid(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_GOAL_REQUIRED_MSG)
        if len(v) > GOAL_MAX_LENGTH:
            raise ValueError(_GOAL_TOO_LONG_MSG)
        return v

    @field_validator("participant_role")
    @classmethod
    def participant_role_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_PARTICIPANT_ROLE_REQUIRED_MSG)
        return v


class UpdateSession(BaseModel):
    # topic/goal/participant_role/status are mandatory: omitted -> unchanged
    # (default None never reaches the validator below since defaults aren't
    # validated), explicit null -> validator fires on the provided None and
    # rejects it. status additionally re-validates against the fixed 3-value
    # set on every provided value. The three other text fields and both link
    # ids are clearable via explicit null, distinguished from omission in the
    # service via model_fields_set.
    topic: str | None = None
    goal: str | None = None
    context: str | None = None
    status: str | None = None
    participant_role: str | None = None
    result_decisions: str | None = None
    result_summary: str | None = None
    linked_story_id: str | None = None
    linked_task_id: str | None = None

    @field_validator("topic")
    @classmethod
    def topic_valid_when_present(cls, v: str | None) -> str | None:
        if v is None:
            raise ValueError(_TOPIC_REQUIRED_MSG)
        if not v.strip():
            raise ValueError(_TOPIC_REQUIRED_MSG)
        if len(v) > TOPIC_MAX_LENGTH:
            raise ValueError(_TOPIC_TOO_LONG_MSG)
        return v

    @field_validator("goal")
    @classmethod
    def goal_valid_when_present(cls, v: str | None) -> str | None:
        if v is None:
            raise ValueError(_GOAL_REQUIRED_MSG)
        if not v.strip():
            raise ValueError(_GOAL_REQUIRED_MSG)
        if len(v) > GOAL_MAX_LENGTH:
            raise ValueError(_GOAL_TOO_LONG_MSG)
        return v

    @field_validator("participant_role")
    @classmethod
    def participant_role_valid_when_present(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            raise ValueError(_PARTICIPANT_ROLE_REQUIRED_MSG)
        return v

    @field_validator("status")
    @classmethod
    def status_valid_when_present(cls, v: str | None) -> str | None:
        if v is None:
            raise ValueError(_STATUS_REQUIRED_MSG)
        if v not in ALL_SESSION_STATUSES:
            raise ValueError(_STATUS_NOT_ALLOWED_MSG.format(v=v))
        return v


# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------


class Session(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    topic: str
    goal: str
    context: str | None
    status: str
    participant_role: str
    result_decisions: str | None
    result_summary: str | None
    linked_story_id: uuid.UUID | None
    linked_task_id: uuid.UUID | None
    archived_at: datetime.datetime | None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    totalPages: int
