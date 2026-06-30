import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.settings.model import ProjectSettings, SystemSettings


class SystemSettingsRepository:
    # Provides read and write access to the system_settings table.
    # All six dictionary keys are always present after seeding.

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_all(self) -> list[SystemSettings]:
        stmt = select(SystemSettings)
        return list(self._session.scalars(stmt).all())

    def get_by_key(self, key: str) -> SystemSettings | None:
        stmt = select(SystemSettings).where(SystemSettings.key == key)
        return self._session.scalars(stmt).first()

    def save(self, row: SystemSettings) -> SystemSettings:
        self._session.add(row)
        self._session.flush()
        return row


class ProjectSettingsRepository:
    # Provides read and write access to the project_settings table.
    # A row exists only when a project has set an override for that key.

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_all_for_project(self, project_id: uuid.UUID) -> list[ProjectSettings]:
        stmt = select(ProjectSettings).where(
            ProjectSettings.project_id == project_id
        )
        return list(self._session.scalars(stmt).all())

    def get_by_project_and_key(
        self,
        project_id: uuid.UUID,
        key: str,
    ) -> ProjectSettings | None:
        stmt = select(ProjectSettings).where(
            ProjectSettings.project_id == project_id,
            ProjectSettings.key == key,
        )
        return self._session.scalars(stmt).first()

    def save(self, row: ProjectSettings) -> ProjectSettings:
        self._session.add(row)
        self._session.flush()
        return row

    def delete(self, row: ProjectSettings) -> None:
        self._session.delete(row)
        self._session.flush()
