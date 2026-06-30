from typing import Protocol

from app.core.constants import ALL_DICT_KEYS


class EffectiveDictionary(Protocol):
    def resolve(
        self,
        project_id: str,
        key: str,
    ) -> list[str]:
        # Returns the effective list of allowed values for the given dictionary key
        # in the context of the given project:
        #   - project_settings.values if a row exists for (project_id, key)
        #   - system_settings.values otherwise
        # Implementations live in the settings service (TASK-003); this Protocol
        # is the interface the future Story/Task/Link/Attachment services depend on.
        ...


def validate_dict_key(key: str) -> None:
    # Raises ValueError when the key is not one of the six known dictionary keys.
    # Called by the settings service before any write; kept here so callers import
    # from a single location instead of repeating the set membership check.
    if key not in ALL_DICT_KEYS:
        raise ValueError(f"Unknown dictionary key: '{key}'. Allowed: {sorted(ALL_DICT_KEYS)}")
