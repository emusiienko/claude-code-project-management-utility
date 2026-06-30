from pydantic import BaseModel, model_validator

from app.core.constants import (
    ALL_DICT_KEYS,
    DICT_KEY_ATTACHMENT_TYPES,
    DICT_KEY_LINK_TYPES,
    DICT_KEY_PARTICIPANT_ROLES,
    DICT_KEY_STORY_STATUSES,
    DICT_KEY_TASK_STATUSES,
    DICT_KEY_TASK_TYPES,
)

# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class UpdateSettingsBody(BaseModel):
    # Partial update body for both system and project settings.
    # Only provided keys are updated; absent keys are left unchanged.
    # Field names match the six DictionaryKey constants exactly.
    task_statuses: list[str] | None = None
    task_types: list[str] | None = None
    story_statuses: list[str] | None = None
    attachment_types: list[str] | None = None
    link_types: list[str] | None = None
    participant_roles: list[str] | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_unknown_keys(cls, data: object) -> object:
        # Reject unknown dictionary keys before Pydantic silently discards them.
        # A key absent from ALL_DICT_KEYS is not a valid dictionary key — callers
        # should receive 400 VALIDATION_ERROR, not a silent no-op.
        if not isinstance(data, dict):
            return data
        unknown = set(data.keys()) - ALL_DICT_KEYS
        if unknown:
            unknown_list = ", ".join(sorted(unknown))
            raise ValueError(
                f"Unknown dictionary key(s): {unknown_list}. "
                f"Valid keys are: {', '.join(sorted(ALL_DICT_KEYS))}."
            )
        return data

    def to_key_value_pairs(self) -> list[tuple[str, list[str]]]:
        # Returns (key, values) pairs for every provided (non-None) field.
        # Field names are bound to the constant values to preserve single source of truth.
        mapping: list[tuple[str, list[str] | None]] = [
            (DICT_KEY_TASK_STATUSES, self.task_statuses),
            (DICT_KEY_TASK_TYPES, self.task_types),
            (DICT_KEY_STORY_STATUSES, self.story_statuses),
            (DICT_KEY_ATTACHMENT_TYPES, self.attachment_types),
            (DICT_KEY_LINK_TYPES, self.link_types),
            (DICT_KEY_PARTICIPANT_ROLES, self.participant_roles),
        ]
        return [(k, v) for k, v in mapping if v is not None]


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class SettingsResponse(BaseModel):
    # Full Settings — all six dictionary keys present.
    task_statuses: list[str]
    task_types: list[str]
    story_statuses: list[str]
    attachment_types: list[str]
    link_types: list[str]
    participant_roles: list[str]

    @classmethod
    def from_dict(cls, data: dict[str, list[str]]) -> "SettingsResponse":
        return cls(
            task_statuses=data[DICT_KEY_TASK_STATUSES],
            task_types=data[DICT_KEY_TASK_TYPES],
            story_statuses=data[DICT_KEY_STORY_STATUSES],
            attachment_types=data[DICT_KEY_ATTACHMENT_TYPES],
            link_types=data[DICT_KEY_LINK_TYPES],
            participant_roles=data[DICT_KEY_PARTICIPANT_ROLES],
        )


class SettingsOverridesResponse(BaseModel):
    # Partial Settings — only keys that have project-level overrides.
    # Absent fields mean no override exists for that key.
    task_statuses: list[str] | None = None
    task_types: list[str] | None = None
    story_statuses: list[str] | None = None
    attachment_types: list[str] | None = None
    link_types: list[str] | None = None
    participant_roles: list[str] | None = None

    @classmethod
    def from_dict(cls, data: dict[str, list[str]]) -> "SettingsOverridesResponse":
        return cls(
            task_statuses=data.get(DICT_KEY_TASK_STATUSES),
            task_types=data.get(DICT_KEY_TASK_TYPES),
            story_statuses=data.get(DICT_KEY_STORY_STATUSES),
            attachment_types=data.get(DICT_KEY_ATTACHMENT_TYPES),
            link_types=data.get(DICT_KEY_LINK_TYPES),
            participant_roles=data.get(DICT_KEY_PARTICIPANT_ROLES),
        )
