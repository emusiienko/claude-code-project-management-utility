import datetime
import uuid
from typing import Any, Protocol, cast

from app.core.errors import NotFoundError, UnprocessableError, ValidationError
from app.settings.model import ProjectSettings, SystemSettings
from app.settings.repository import ProjectSettingsRepository, SystemSettingsRepository
from app.settings.schema import (
    ALL_DICT_KEYS,
    DICT_KEY_LINK_TYPES,
    DICT_KEY_PARTICIPANT_ROLES,
    KEY_DEFAULT_WEB_UI_ROLE,
    LinkTypeEntry,
    UpdateSettingsBody,
    validate_settings_key,
)

_EMPTY_VALUES_MSG = "Dictionary values cannot be empty."
_LINK_TYPE_UNIQUE_MSG = "link_types values must be unique"
_VALUE_NOT_ALLOWED_MSG = "Value '{v}' is not allowed. Allowed: {allowed}."


class EffectiveDictionary(Protocol):
    # Future domain services (stories, tasks, links) depend on this Protocol — never on
    # SettingsService directly. For link_types, returns the list of value strings extracted
    # from the structured entries so callers can do plain membership checks.
    def resolve(self, project_id: str, key: str) -> list[str]: ...


class SettingsService:
    def __init__(
        self,
        system_repo: SystemSettingsRepository,
        project_repo: ProjectSettingsRepository,
    ) -> None:
        self._system_repo = system_repo
        self._project_repo = project_repo

    # ------------------------------------------------------------------
    # System-level operations
    # ------------------------------------------------------------------

    def get_system_settings(self) -> dict[str, Any]:
        rows = self._system_repo.get_all()
        return {row.key: row.values for row in rows}

    def update_system_settings(self, body: UpdateSettingsBody) -> dict[str, Any]:
        for key, values in body.to_key_value_pairs():
            if key == DICT_KEY_LINK_TYPES:
                link_entries = self._validate_link_types(
                    cast(list[LinkTypeEntry], values)
                )
                serialized: list[Any] = [e.model_dump() for e in link_entries]
                row = self._system_repo.get_by_key(key)
                if row is None:
                    row = SystemSettings(
                        key=key,
                        values=serialized,
                        updated_at=datetime.datetime.now(tz=datetime.timezone.utc),
                    )
                else:
                    row.values = serialized
                    row.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
                self._system_repo.save(row)
            else:
                plain_values: list[Any] = values
                self._validate_plain_values(plain_values)
                row = self._system_repo.get_by_key(key)
                if row is None:
                    # Should not happen after seed migration, but guard defensively.
                    row = SystemSettings(
                        key=key,
                        values=plain_values,
                        updated_at=datetime.datetime.now(tz=datetime.timezone.utc),
                    )
                else:
                    row.values = plain_values
                    row.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
                self._system_repo.save(row)

        if body.default_web_ui_role is not None:
            allowed = self._system_participant_roles()
            self._validate_default_web_ui_role(body.default_web_ui_role, allowed)
            row = self._system_repo.get_by_key(KEY_DEFAULT_WEB_UI_ROLE)
            if row is None:
                row = SystemSettings(
                    key=KEY_DEFAULT_WEB_UI_ROLE,
                    values=body.default_web_ui_role,
                    updated_at=datetime.datetime.now(tz=datetime.timezone.utc),
                )
            else:
                row.values = body.default_web_ui_role
                row.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
            self._system_repo.save(row)

        return self.get_system_settings()

    # ------------------------------------------------------------------
    # Project-level override operations
    # ------------------------------------------------------------------

    def get_project_settings(self, project_id: str) -> dict[str, Any]:
        pid = self._assert_project_exists(project_id)
        rows = self._project_repo.get_all_for_project(pid)
        return {row.key: row.values for row in rows}

    def update_project_settings(
        self,
        project_id: str,
        body: UpdateSettingsBody,
    ) -> dict[str, Any]:
        pid = self._assert_project_exists(project_id)
        for key, values in body.to_key_value_pairs():
            if key == DICT_KEY_LINK_TYPES:
                link_entries = self._validate_link_types(cast(list[LinkTypeEntry], values))  # type: ignore[arg-type]
                serialized: list[Any] = [e.model_dump() for e in link_entries]
                row = self._project_repo.get_by_project_and_key(pid, key)
                if row is None:
                    row = ProjectSettings(
                        project_id=pid,
                        key=key,
                        values=serialized,
                        updated_at=datetime.datetime.now(tz=datetime.timezone.utc),
                    )
                else:
                    row.values = serialized
                    row.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
                self._project_repo.save(row)
            else:
                plain_values: list[Any] = values
                self._validate_plain_values(plain_values)
                row = self._project_repo.get_by_project_and_key(pid, key)
                if row is None:
                    row = ProjectSettings(
                        project_id=pid,
                        key=key,
                        values=plain_values,
                        updated_at=datetime.datetime.now(tz=datetime.timezone.utc),
                    )
                else:
                    row.values = plain_values
                    row.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
                self._project_repo.save(row)

        if body.default_web_ui_role is not None:
            # Validated against the project's effective participant_roles, not the
            # system default — an override can legitimately narrow or widen the set.
            allowed = self.resolve(project_id, DICT_KEY_PARTICIPANT_ROLES)
            self._validate_default_web_ui_role(body.default_web_ui_role, allowed)
            row = self._project_repo.get_by_project_and_key(
                pid, KEY_DEFAULT_WEB_UI_ROLE
            )
            if row is None:
                row = ProjectSettings(
                    project_id=pid,
                    key=KEY_DEFAULT_WEB_UI_ROLE,
                    values=body.default_web_ui_role,
                    updated_at=datetime.datetime.now(tz=datetime.timezone.utc),
                )
            else:
                row.values = body.default_web_ui_role
                row.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
            self._project_repo.save(row)

        # PUT returns effective settings per the contract, not just the stored override.
        return self.resolve_all(project_id)

    def clear_project_setting(self, project_id: str, key: str) -> dict[str, Any]:
        pid = self._assert_project_exists(project_id)
        self._validate_key(key)

        row = self._project_repo.get_by_project_and_key(pid, key)
        if row is not None:
            self._project_repo.delete(row)
        # Clearing an absent override is a no-op — caller gets the system default.
        return self.resolve_all(project_id)

    # ------------------------------------------------------------------
    # Effective resolution — implements EffectiveDictionary protocol
    # ------------------------------------------------------------------

    def resolve(self, project_id: str, key: str) -> list[str]:
        # For link_types, returns only the value strings extracted from structured entries
        # so that TaskLinkService / StoryLinkService can do plain membership checks.
        pid = uuid.UUID(project_id)
        override = self._project_repo.get_by_project_and_key(pid, key)
        if override is not None:
            raw: list[Any] = override.values
        else:
            system_row = self._system_repo.get_by_key(key)
            if system_row is None:
                # System default missing — data integrity violation; should never happen after seed.
                return []
            raw = system_row.values

        if key == DICT_KEY_LINK_TYPES:
            return _extract_link_type_values(raw)
        return raw  # type: ignore[return-value]

    def get_effective_settings(self, project_id: str) -> dict[str, Any]:
        self._assert_project_exists(project_id)
        return self.resolve_all(project_id)

    def resolve_all(self, project_id: str) -> dict[str, Any]:
        # Derived on demand — never stored.
        pid = uuid.UUID(project_id)
        overrides_by_key = {
            row.key: row.values for row in self._project_repo.get_all_for_project(pid)
        }
        system_by_key = {row.key: row.values for row in self._system_repo.get_all()}
        result: dict[str, Any] = {
            key: overrides_by_key.get(key, system_by_key.get(key, []))
            for key in ALL_DICT_KEYS
        }
        # Scalar key: same override-then-system-default resolution, empty-string
        # fallback should only happen if the seed is missing (data integrity issue).
        result[KEY_DEFAULT_WEB_UI_ROLE] = overrides_by_key.get(
            KEY_DEFAULT_WEB_UI_ROLE, system_by_key.get(KEY_DEFAULT_WEB_UI_ROLE, "")
        )
        return result

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _assert_project_exists(self, project_id: str) -> uuid.UUID:
        try:
            pid = uuid.UUID(project_id)
        except ValueError:
            raise NotFoundError(f"Project '{project_id}' not found.")
        self._project_repo.assert_project_exists(pid)
        return pid

    @staticmethod
    def _validate_key(key: str) -> None:
        # Wraps ValueError from validate_settings_key into a domain ValidationError.
        try:
            validate_settings_key(key)
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc

    @staticmethod
    def _validate_plain_values(values: list[Any]) -> None:
        if not values:
            raise ValidationError(_EMPTY_VALUES_MSG)

    @staticmethod
    def _validate_default_web_ui_role(value: str, allowed: list[str]) -> None:
        # Field-level non-empty validation already happened in UpdateSettingsBody;
        # this is the business rule (effective participant_roles membership) that
        # Pydantic cannot know.
        if value not in allowed:
            allowed_str = ", ".join(allowed)
            raise UnprocessableError(
                _VALUE_NOT_ALLOWED_MSG.format(v=value, allowed=allowed_str)
            )

    def _system_participant_roles(self) -> list[str]:
        row = self._system_repo.get_by_key(DICT_KEY_PARTICIPANT_ROLES)
        return row.values if row is not None else []

    @staticmethod
    def _validate_link_types(values: list[LinkTypeEntry]) -> list[LinkTypeEntry]:
        # Validates business rules that go beyond Pydantic field-level constraints.
        # Each entry's field emptiness/length is already enforced by LinkTypeEntry validators.
        if not values:
            raise ValidationError(_EMPTY_VALUES_MSG)
        seen: set[str] = set()
        for entry in values:
            if entry.value in seen:
                raise ValidationError(_LINK_TYPE_UNIQUE_MSG)
            seen.add(entry.value)
        return values


# ---------------------------------------------------------------------------
# Module-level helper — pure function, no I/O
# ---------------------------------------------------------------------------


def _extract_link_type_values(raw: list[Any]) -> list[str]:
    # Extracts the value field from each structured link_types entry.
    # Entries that are plain strings (pre-migration data) are returned as-is.
    result: list[str] = []
    for entry in raw:
        if isinstance(entry, dict):
            v = entry.get("value", "")
            if v:
                result.append(v)
        elif isinstance(entry, str):
            # Defensive: handle legacy flat-string entries that survived a failed migration.
            result.append(entry)
    return result
