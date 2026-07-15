from typing import Any

from pydantic import BaseModel, field_validator, model_validator

# ---------------------------------------------------------------------------
# Dictionary key constants — single source of truth for all valid keys.
# Imported by service.py (business logic) and used here for schema validation.
# ---------------------------------------------------------------------------

DICT_KEY_TASK_STATUSES = "task_statuses"
DICT_KEY_TASK_TYPES = "task_types"
DICT_KEY_STORY_STATUSES = "story_statuses"
DICT_KEY_LINK_TYPES = "link_types"
DICT_KEY_PARTICIPANT_ROLES = "participant_roles"

ALL_DICT_KEYS: frozenset[str] = frozenset(
    {
        DICT_KEY_TASK_STATUSES,
        DICT_KEY_TASK_TYPES,
        DICT_KEY_STORY_STATUSES,
        DICT_KEY_LINK_TYPES,
        DICT_KEY_PARTICIPANT_ROLES,
    }
)

# Keys whose values remain plain strings — all except link_types.
PLAIN_STRING_DICT_KEYS: frozenset[str] = ALL_DICT_KEYS - {DICT_KEY_LINK_TYPES}

_LINK_TYPE_ENTRY_MSG = (
    "link_types entries must be objects with 'value', 'outbound', and 'inbound' fields"
)
_LINK_TYPE_UNIQUE_MSG = "link_types values must be unique"


def validate_dict_key(key: str) -> None:
    if key not in ALL_DICT_KEYS:
        raise ValueError(f"Unknown dictionary key: '{key}'. Allowed: {sorted(ALL_DICT_KEYS)}")


# ---------------------------------------------------------------------------
# Structured link_types entry
# ---------------------------------------------------------------------------


class LinkTypeEntry(BaseModel):
    value: str
    outbound: str
    inbound: str

    @field_validator("value", "outbound", "inbound")
    @classmethod
    def non_empty_max_200(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("must be a non-empty string")
        if len(stripped) > 200:
            raise ValueError("must not exceed 200 characters")
        return stripped


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class UpdateSettingsBody(BaseModel):
    # Partial update body for both system and project settings.
    # Only provided keys are updated; absent keys are left unchanged.
    # Field names match the five DictionaryKey constants exactly.
    task_statuses: list[str] | None = None
    task_types: list[str] | None = None
    story_statuses: list[str] | None = None
    link_types: list[LinkTypeEntry] | None = None
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
        # Validate link_types entries are objects before Pydantic attempts to parse them,
        # so we can produce the exact domain error message the contract requires.
        if "link_types" in data and data["link_types"] is not None:
            for entry in data["link_types"]:
                if not isinstance(entry, dict):
                    raise ValueError(_LINK_TYPE_ENTRY_MSG)
        return data

    def to_key_value_pairs(self) -> list[tuple[str, list[str] | list[LinkTypeEntry]]]:
        # Returns (key, values) pairs for every provided (non-None) field.
        # Field names are bound to the constant values to preserve single source of truth.
        mapping: list[tuple[str, list[str] | list[LinkTypeEntry] | None]] = [
            (DICT_KEY_TASK_STATUSES, self.task_statuses),
            (DICT_KEY_TASK_TYPES, self.task_types),
            (DICT_KEY_STORY_STATUSES, self.story_statuses),
            (DICT_KEY_LINK_TYPES, self.link_types),
            (DICT_KEY_PARTICIPANT_ROLES, self.participant_roles),
        ]
        return [(k, v) for k, v in mapping if v is not None]


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class SettingsResponse(BaseModel):
    # Full Settings — all five dictionary keys present.
    task_statuses: list[str]
    task_types: list[str]
    story_statuses: list[str]
    link_types: list[LinkTypeEntry]
    participant_roles: list[str]

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SettingsResponse":
        raw_link_types = data.get(DICT_KEY_LINK_TYPES, [])
        return cls(
            task_statuses=data[DICT_KEY_TASK_STATUSES],
            task_types=data[DICT_KEY_TASK_TYPES],
            story_statuses=data[DICT_KEY_STORY_STATUSES],
            link_types=_coerce_link_type_entries(raw_link_types),
            participant_roles=data[DICT_KEY_PARTICIPANT_ROLES],
        )


class SettingsOverridesResponse(BaseModel):
    # Partial Settings — only keys that have project-level overrides.
    # Absent fields mean no override exists for that key.
    task_statuses: list[str] | None = None
    task_types: list[str] | None = None
    story_statuses: list[str] | None = None
    link_types: list[LinkTypeEntry] | None = None
    participant_roles: list[str] | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SettingsOverridesResponse":
        raw_link_types = data.get(DICT_KEY_LINK_TYPES)
        link_types: list[LinkTypeEntry] | None = None
        if raw_link_types is not None:
            link_types = _coerce_link_type_entries(raw_link_types)
        return cls(
            task_statuses=data.get(DICT_KEY_TASK_STATUSES),
            task_types=data.get(DICT_KEY_TASK_TYPES),
            story_statuses=data.get(DICT_KEY_STORY_STATUSES),
            link_types=link_types,
            participant_roles=data.get(DICT_KEY_PARTICIPANT_ROLES),
        )


# ---------------------------------------------------------------------------
# Module-level helper — pure function, no I/O
# ---------------------------------------------------------------------------


def _coerce_link_type_entries(raw: list[Any]) -> list[LinkTypeEntry]:
    # Converts raw DB values (either structured dicts or legacy flat strings) into
    # LinkTypeEntry objects. Legacy flat strings pre-date TASK-002 migration and are
    # coerced defensively so reads never crash on un-migrated data.
    result: list[LinkTypeEntry] = []
    for entry in raw:
        if isinstance(entry, dict):
            result.append(LinkTypeEntry.model_validate(entry))
        elif isinstance(entry, str) and entry:
            result.append(LinkTypeEntry(value=entry, outbound=entry, inbound=entry))
    return result
