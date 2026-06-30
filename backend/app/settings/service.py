import datetime
import uuid
from typing import Protocol

from app.core.constants import ALL_DICT_KEYS
from app.core.dict_resolver import validate_dict_key
from app.core.errors import NotFoundError, ValidationError
from app.settings.model import ProjectSettings, SystemSettings
from app.settings.repository import ProjectSettingsRepository, SystemSettingsRepository

_EMPTY_VALUES_MSG = "Dictionary values cannot be empty."


class ProjectChecker(Protocol):
    # Abstraction used by SettingsService to verify a project exists
    # before performing any project-scoped operation.
    # Concrete implementation provided by the project domain repository
    # once the project domain is built (STORY-003).
    def exists(self, project_id: uuid.UUID) -> bool: ...


class SettingsService:
    # Single home of all Settings business rules.
    # Called identically by REST controllers and MCP tools.
    # Also implements the EffectiveDictionary protocol from core/dict_resolver.py
    # so future Story/Task/Link/Attachment services can depend on it by that
    # interface.

    def __init__(
        self,
        system_repo: SystemSettingsRepository,
        project_repo: ProjectSettingsRepository,
        project_checker: ProjectChecker,
    ) -> None:
        self._system_repo = system_repo
        self._project_repo = project_repo
        self._project_checker = project_checker

    # ------------------------------------------------------------------
    # System-level operations
    # ------------------------------------------------------------------

    def get_system_settings(self) -> dict[str, list[str]]:
        rows = self._system_repo.get_all()
        return {row.key: row.values for row in rows}

    def update_system_setting(self, key: str, values: list[str]) -> dict[str, list[str]]:
        self._validate_key(key)
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

    def update_project_setting(
        self,
        project_id: str,
        key: str,
        values: list[str],
    ) -> dict[str, list[str]]:
        pid = self._assert_project_exists(project_id)
        self._validate_key(key)
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
        # Return effective settings per the contract: PUT returns effective, not stored.
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
        # Returns the effective list for one key: project override if present,
        # otherwise the system default.  Future Story/Task/Link/Attachment services
        # call this method via the EffectiveDictionary Protocol.
        pid = uuid.UUID(project_id)
        override = self._project_repo.get_by_project_and_key(pid, key)
        if override is not None:
            return override.values

        system_row = self._system_repo.get_by_key(key)
        if system_row is None:
            # System default missing — data integrity violation; caller gets empty.
            # This should never happen after a correct seed migration.
            return []
        return system_row.values

    def get_effective_settings(self, project_id: str) -> dict[str, list[str]]:
        # Public entry point for effective-settings reads.
        # Asserts the project exists (NotFoundError if not) then resolves all keys.
        self._assert_project_exists(project_id)
        return self.resolve_all(project_id)

    def resolve_all(self, project_id: str) -> dict[str, list[str]]:
        # Returns effective settings for all six keys in a single call.
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
        if not self._project_checker.exists(pid):
            raise NotFoundError(f"Project '{project_id}' not found.")
        return pid

    @staticmethod
    def _validate_key(key: str) -> None:
        # Translates the ValueError from core into a domain ValidationError.
        try:
            validate_dict_key(key)
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc

    @staticmethod
    def _validate_values(values: list[str]) -> None:
        if not values:
            raise ValidationError(_EMPTY_VALUES_MSG)
