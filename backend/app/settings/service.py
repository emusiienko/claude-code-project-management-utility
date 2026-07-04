import datetime
import uuid
from typing import Protocol

from app.core.errors import NotFoundError, ValidationError
from app.settings.model import ProjectSettings, SystemSettings
from app.settings.repository import ProjectSettingsRepository, SystemSettingsRepository
from app.settings.schema import ALL_DICT_KEYS, UpdateSettingsBody, validate_dict_key

_EMPTY_VALUES_MSG = "Dictionary values cannot be empty."


class EffectiveDictionary(Protocol):
    # Future domain services (stories, tasks, links) depend on this Protocol — never on
    # SettingsService directly.
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

    def get_system_settings(self) -> dict[str, list[str]]:
        rows = self._system_repo.get_all()
        return {row.key: row.values for row in rows}

    def update_system_settings(self, body: UpdateSettingsBody) -> dict[str, list[str]]:
        for key, values in body.to_key_value_pairs():
            self._validate_values(values)
            row = self._system_repo.get_by_key(key)
            if row is None:
                # Should not happen after seed migration, but guard defensively.
                row = SystemSettings(
                    key=key,
                    values=values,
                    updated_at=datetime.datetime.now(tz=datetime.timezone.utc),
                )
            else:
                row.values = values
                row.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
            self._system_repo.save(row)
        return self.get_system_settings()

    # ------------------------------------------------------------------
    # Project-level override operations
    # ------------------------------------------------------------------

    def get_project_settings(self, project_id: str) -> dict[str, list[str]]:
        pid = self._assert_project_exists(project_id)
        rows = self._project_repo.get_all_for_project(pid)
        return {row.key: row.values for row in rows}

    def update_project_settings(
        self,
        project_id: str,
        body: UpdateSettingsBody,
    ) -> dict[str, list[str]]:
        pid = self._assert_project_exists(project_id)
        for key, values in body.to_key_value_pairs():
            self._validate_values(values)
            row = self._project_repo.get_by_project_and_key(pid, key)
            if row is None:
                row = ProjectSettings(
                    project_id=pid,
                    key=key,
                    values=values,
                    updated_at=datetime.datetime.now(tz=datetime.timezone.utc),
                )
            else:
                row.values = values
                row.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
            self._project_repo.save(row)
        # PUT returns effective settings per the contract, not just the stored override.
        return self.resolve_all(project_id)

    def clear_project_setting(self, project_id: str, key: str) -> dict[str, list[str]]:
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
        pid = uuid.UUID(project_id)
        override = self._project_repo.get_by_project_and_key(pid, key)
        if override is not None:
            return override.values

        system_row = self._system_repo.get_by_key(key)
        if system_row is None:
            # System default missing — data integrity violation; should never happen after seed.
            return []
        return system_row.values

    def get_effective_settings(self, project_id: str) -> dict[str, list[str]]:
        self._assert_project_exists(project_id)
        return self.resolve_all(project_id)

    def resolve_all(self, project_id: str) -> dict[str, list[str]]:
        # Derived on demand — never stored.
        pid = uuid.UUID(project_id)
        overrides_by_key = {
            row.key: row.values
            for row in self._project_repo.get_all_for_project(pid)
        }
        system_by_key = {
            row.key: row.values for row in self._system_repo.get_all()
        }
        return {
            key: overrides_by_key.get(key, system_by_key.get(key, []))
            for key in ALL_DICT_KEYS
        }

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
        # Wraps ValueError from validate_dict_key into a domain ValidationError.
        try:
            validate_dict_key(key)
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc

    @staticmethod
    def _validate_values(values: list[str]) -> None:
        if not values:
            raise ValidationError(_EMPTY_VALUES_MSG)